import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Rider } from '../models/Rider';
import { CONSTANTS } from '../config/constants';
import { getNearbyRiders } from './geoService';
import { emitOrderToRider, emitOrderToStation } from './realtimeService';
import { sendPushNotification } from './notificationService';

// In-memory lock to prevent concurrent dispatch for the same order
const dispatchLocks = new Set<string>();

/** Returns how many active (undelivered) orders a rider currently has */
async function getRiderActiveOrderCount(riderId: mongoose.Types.ObjectId | string): Promise<number> {
  return Order.countDocuments({
    riderId,
    status: { $in: ['accepted', 'at_station', 'en_route'] },
  });
}

/** Returns the max concurrent orders allowed for a vehicle type */
function getVehicleCapacity(vehicleType: string): number {
  return CONSTANTS.VEHICLE_ORDER_LIMITS[vehicleType] ?? 3;
}

export async function dispatchOrder(orderId: string): Promise<void> {
  if (dispatchLocks.has(orderId)) {
    console.log(`[Dispatch] Order ${orderId} already being dispatched — skipping`);
    return;
  }
  dispatchLocks.add(orderId);
  try {
    await _dispatchOrder(orderId);
  } finally {
    dispatchLocks.delete(orderId);
  }
}

async function _dispatchOrder(orderId: string): Promise<void> {
  const order = await Order.findById(orderId).populate('stationId', 'lat lng name _id');
  if (!order || order.status !== 'pending') {
    console.log(`[Dispatch] Skipping ${orderId} — status: ${order?.status ?? 'not found'}`);
    return;
  }

  const station = order.stationId as unknown as { _id: mongoose.Types.ObjectId; lat: number; lng: number; name: string };
  console.log(`[Dispatch] Order ${orderId} — station: ${station.name} (${station.lat}, ${station.lng})`);
  console.log(`[Dispatch] Dispatch attempts so far: ${order.dispatchAttempts.length}/${CONSTANTS.MAX_DISPATCH_ATTEMPTS}`);

  if (order.dispatchAttempts.length >= CONSTANTS.MAX_DISPATCH_ATTEMPTS) {
    console.log(`[Dispatch] Max attempts reached — escalating`);
    await escalateToAdmin(orderId);
    return;
  }

  // Already-attempted rider IDs for this order
  const attemptedIds = new Set(order.dispatchAttempts.map((a) => a.riderId.toString()));

  // ── Find eligible riders within dispatch radius of the station ────────────
  // Only riders physically near the station are eligible — no cross-city dispatch
  const nearbyRiders = await getNearbyRiders(station.lat, station.lng, CONSTANTS.DISPATCH_RADIUS_KM);
  console.log(`[Dispatch] Nearby riders within ${CONSTANTS.DISPATCH_RADIUS_KM}km: ${nearbyRiders.length}`);

  // Filter out already-attempted riders
  const nearbyEligible = nearbyRiders.filter((r) => !attemptedIds.has(r.riderId));
  console.log(`[Dispatch] Eligible after filtering attempted: ${nearbyEligible.length}`);

  if (nearbyEligible.length === 0) {
    console.log(`[Dispatch] No nearby eligible riders — escalating`);
    await escalateToAdmin(orderId);
    return;
  }

  // Fetch full rider docs for capacity check, sorted by distance (nearest first)
  const riderDocs = await Rider.find({
    _id: { $in: nearbyEligible.map((r) => new mongoose.Types.ObjectId(r.riderId)) },
    kycStatus: 'approved',
    status: { $in: ['available', 'busy'] },
  }).select('_id name status vehicleType location').lean();

  // Re-sort by distance order from geo query
  const distanceMap = new Map(nearbyEligible.map((r) => [r.riderId, r.distanceKm]));
  riderDocs.sort((a, b) => (distanceMap.get(a._id.toString()) ?? 999) - (distanceMap.get(b._id.toString()) ?? 999));

  console.log(`[Dispatch] Riders in radius with valid status: ${riderDocs.length}`);

  // Find first rider under their vehicle capacity
  let rider = null;
  for (const candidate of riderDocs) {
    const capacity = getVehicleCapacity(candidate.vehicleType);
    const activeCount = await getRiderActiveOrderCount(candidate._id);
    console.log(`[Dispatch] Candidate ${candidate.name} (${candidate.vehicleType}) — active: ${activeCount}/${capacity} — dist: ${distanceMap.get(candidate._id.toString())?.toFixed(1)}km`);
    if (activeCount < capacity) {
      rider = candidate;
      break;
    }
  }

  if (!rider) {
    console.log(`[Dispatch] All nearby riders at capacity — escalating`);
    await escalateToAdmin(orderId);
    return;
  }

  console.log(`[Dispatch] Selected rider: ${rider.name} (${rider._id}) — emitting order:new`);

  order.dispatchAttempts.push({
    riderId: new mongoose.Types.ObjectId(rider._id.toString()),
    sentAt: new Date(),
    outcome: 'timeout',
  });
  await order.save();

  const attemptIndex = order.dispatchAttempts.length - 1;

  const orderSummary = {
    orderId:         order._id.toString(),
    cylinders:       order.cylinders,
    orderType:       order.orderType,
    deliveryAddress: order.deliveryAddress,
    earning:         order.deliveryFee,
    timeoutSeconds:  CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS / 1000,
  };

  emitOrderToRider(rider._id.toString(), orderSummary);
  const roomSize = (require('./realtimeService').io as any)?.sockets?.adapter?.rooms?.get(`rider:${rider._id}`)?.size ?? 0;
  console.log(`[Dispatch] Socket emitted to rider:${rider._id} — room size: ${roomSize}`);

  // Push notification
  const fullRider = await Rider.findById(rider._id).select('fcmToken');
  if (fullRider?.fcmToken) {
    const sizes = order.cylinders.map((c) => `${c.quantity}×${c.size}kg`).join(', ');
    await sendPushNotification(fullRider.fcmToken, {
      title: 'New Delivery Order 🛵',
      body: `${sizes} — GH₵${orderSummary.earning}. Tap to accept.`,
      data: { orderId: order._id.toString(), screen: 'OrderAccept' },
    });
  }

  emitOrderToStation(station._id.toString(), {
    orderId:         order._id.toString(),
    cylinders:       order.cylinders,
    orderType:       order.orderType,
    deliveryAddress: order.deliveryAddress,
    riderName:       rider.name,
  });

  // Timeout — try next rider if not accepted
  setTimeout(async () => {
    try {
      const freshOrder = await Order.findById(orderId);
      if (!freshOrder || freshOrder.status !== 'pending') return;
      const attempt = freshOrder.dispatchAttempts[attemptIndex];
      if (attempt && attempt.riderId.toString() === rider!._id.toString()) {
        attempt.outcome = 'timeout';
        await freshOrder.save();
      }
      await dispatchOrder(orderId);
    } catch (err) {
      console.error('[Dispatch] Timeout handler error:', err);
    }
  }, CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS);
}

export async function markDispatchAccepted(orderId: string, riderId: string): Promise<void> {
  await Order.updateOne(
    { _id: orderId, 'dispatchAttempts.riderId': new mongoose.Types.ObjectId(riderId) },
    { $set: { 'dispatchAttempts.$.outcome': 'accepted' } }
  );
}

export async function markDispatchDeclined(orderId: string, riderId: string): Promise<void> {
  await Order.updateOne(
    { _id: orderId, 'dispatchAttempts.riderId': new mongoose.Types.ObjectId(riderId) },
    { $set: { 'dispatchAttempts.$.outcome': 'declined' } }
  );
  await dispatchOrder(orderId);
}

async function escalateToAdmin(orderId: string): Promise<void> {
  await Order.findByIdAndUpdate(orderId, {
    $push: {
      statusHistory: {
        status: 'pending',
        triggeredBy: 'system',
        timestamp: new Date(),
        note: 'Escalated to admin — no riders available or all at capacity',
      },
    },
  });
  console.warn(`[Dispatch] Order ${orderId} escalated — no riders available or all at capacity`);
}
