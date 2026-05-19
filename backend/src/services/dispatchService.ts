import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Rider } from '../models/Rider';
import { Admin } from '../models/Admin';
import { CONSTANTS } from '../config/constants';
import { getNearbyRiders } from './geoService';
import { emitOrderToRider, emitOrderToStation, io } from './realtimeService';
import { sendSMS } from './notificationService';

// Max hard declines before escalating — timeouts don't count toward this
const MAX_DECLINES = 5;

// Radius expansion per retry tier (km)
const RADIUS_TIERS = [
  CONSTANTS.DISPATCH_RADIUS_KM,
  CONSTANTS.DISPATCH_RADIUS_KM * 1.5,
  CONSTANTS.DISPATCH_RADIUS_KM * 2,
];

// Redis-based distributed lock would be ideal at scale;
// using in-memory map with expiry as a safe fallback for single-instance
const dispatchLocks = new Map<string, NodeJS.Timeout>();

function acquireLock(orderId: string): boolean {
  if (dispatchLocks.has(orderId)) return false;
  // Auto-release lock after 2× timeout to prevent permanent locks on crash
  const timer = setTimeout(() => dispatchLocks.delete(orderId), CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS * 2);
  dispatchLocks.set(orderId, timer);
  return true;
}

function releaseLock(orderId: string): void {
  const timer = dispatchLocks.get(orderId);
  if (timer) clearTimeout(timer);
  dispatchLocks.delete(orderId);
}

async function getRiderActiveOrderCount(riderId: mongoose.Types.ObjectId | string): Promise<number> {
  return Order.countDocuments({
    riderId,
    status: { $in: ['accepted', 'at_station', 'en_route'] },
  });
}

function getVehicleCapacity(vehicleType: string): number {
  return CONSTANTS.VEHICLE_ORDER_LIMITS[vehicleType] ?? 3;
}

function isRiderOnline(riderId: string): boolean {
  const roomSize = io?.sockets?.adapter?.rooms?.get(`rider:${riderId}`)?.size ?? 0;
  return roomSize > 0;
}

export async function dispatchOrder(orderId: string): Promise<void> {
  if (!acquireLock(orderId)) {
    console.log(`[Dispatch] Order ${orderId} already being dispatched — skipping`);
    return;
  }
  try {
    await _dispatchOrder(orderId);
  } finally {
    releaseLock(orderId);
  }
}

async function _dispatchOrder(orderId: string): Promise<void> {
  const order = await Order.findById(orderId).populate('stationId', 'lat lng name _id');
  if (!order || order.status !== 'pending') {
    console.log(`[Dispatch] Skipping ${orderId} — status: ${order?.status ?? 'not found'}`);
    return;
  }

  const station = order.stationId as unknown as { _id: mongoose.Types.ObjectId; lat: number; lng: number; name: string };

  // Count only hard declines — timeouts don't block escalation
  const declineCount = order.dispatchAttempts.filter((a) => a.outcome === 'declined').length;
  const attemptTier  = order.dispatchAttempts.length;

  console.log(`[Dispatch] Order ${orderId} — declines: ${declineCount}/${MAX_DECLINES}, attempts: ${attemptTier}`);

  if (declineCount >= MAX_DECLINES) {
    console.log(`[Dispatch] Max declines reached — escalating`);
    await escalateToAdmin(orderId, 'Max rider declines reached');
    return;
  }

  const attemptedIds = new Set(order.dispatchAttempts.map((a) => a.riderId.toString()));

  // Expand search radius on each retry tier
  const radiusKm = RADIUS_TIERS[Math.min(attemptTier, RADIUS_TIERS.length - 1)];
  console.log(`[Dispatch] Searching radius: ${radiusKm}km (tier ${Math.min(attemptTier, RADIUS_TIERS.length - 1)})`);

  const nearbyRiders = await getNearbyRiders(station.lat, station.lng, radiusKm);
  const nearbyEligible = nearbyRiders.filter((r) => !attemptedIds.has(r.riderId));

  console.log(`[Dispatch] Nearby: ${nearbyRiders.length}, eligible (not attempted): ${nearbyEligible.length}`);

  if (nearbyEligible.length === 0) {
    await escalateToAdmin(orderId, 'No eligible riders in range');
    return;
  }

  const riderDocs = await Rider.find({
    _id: { $in: nearbyEligible.map((r) => new mongoose.Types.ObjectId(r.riderId)) },
    kycStatus: 'approved',
    status: { $in: ['available', 'busy'] },
    isActive: true,
  }).select('_id name status vehicleType location phone').lean();

  const distanceMap = new Map(nearbyEligible.map((r) => [r.riderId, r.distanceKm]));
  riderDocs.sort((a, b) => (distanceMap.get(a._id.toString()) ?? 999) - (distanceMap.get(b._id.toString()) ?? 999));

  // Pick first rider who is: online via socket AND under vehicle capacity
  // Falls back to offline riders (SMS-only) if no online rider found
  let rider = null;
  let riderIsOnline = false;

  for (const candidate of riderDocs) {
    const capacity    = getVehicleCapacity(candidate.vehicleType);
    const activeCount = await getRiderActiveOrderCount(candidate._id);
    const online      = isRiderOnline(candidate._id.toString());
    console.log(`[Dispatch] Candidate ${candidate.name} — active: ${activeCount}/${capacity}, online: ${online}, dist: ${distanceMap.get(candidate._id.toString())?.toFixed(1)}km`);

    if (activeCount < capacity) {
      if (online) {
        rider = candidate;
        riderIsOnline = true;
        break;
      }
      // Keep as fallback if no online rider found
      if (!rider) rider = candidate;
    }
  }

  if (!rider) {
    await escalateToAdmin(orderId, 'All nearby riders at capacity');
    return;
  }

  console.log(`[Dispatch] Selected rider: ${rider.name} (${rider._id}) — online: ${riderIsOnline}`);

  const attemptIndex = order.dispatchAttempts.length;
  order.dispatchAttempts.push({
    riderId: new mongoose.Types.ObjectId(rider._id.toString()),
    sentAt:  new Date(),
    outcome: 'timeout',
  });
  await order.save();

  const orderSummary = {
    orderId:         order._id.toString(),
    cylinders:       order.cylinders,
    orderType:       order.orderType,
    deliveryAddress: order.deliveryAddress,
    earning:         order.deliveryFee,
    timeoutSeconds:  CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS / 1000,
  };

  // Always emit socket event (rider may reconnect within timeout window)
  emitOrderToRider(rider._id.toString(), orderSummary);

  // Always send SMS — primary notification channel
  const sizes = order.cylinders.map((c) => `${c.quantity}x${c.size}kg`).join(', ');
  try {
    await sendSMS(
      rider.phone,
      `GetGas: New delivery order! ${sizes} — GH₵${order.deliveryFee}. Open the app to accept. Order #${order._id.toString().slice(-6).toUpperCase()}`
    );
  } catch (err) {
    console.error('[Dispatch] SMS to rider failed:', err);
  }

  emitOrderToStation(station._id.toString(), {
    orderId:         order._id.toString(),
    cylinders:       order.cylinders,
    orderType:       order.orderType,
    deliveryAddress: order.deliveryAddress,
    riderName:       rider.name,
  });

  // Timeout — re-dispatch to next rider if still pending
  setTimeout(async () => {
    try {
      const freshOrder = await Order.findById(orderId);
      if (!freshOrder || freshOrder.status !== 'pending') return;

      const attempt = freshOrder.dispatchAttempts[attemptIndex];
      if (attempt && attempt.outcome === 'timeout') {
        attempt.respondedAt = new Date();
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
    { $set: { 'dispatchAttempts.$.outcome': 'accepted', 'dispatchAttempts.$.respondedAt': new Date() } }
  );
}

export async function markDispatchDeclined(orderId: string, riderId: string): Promise<void> {
  await Order.updateOne(
    { _id: orderId, 'dispatchAttempts.riderId': new mongoose.Types.ObjectId(riderId) },
    { $set: { 'dispatchAttempts.$.outcome': 'declined', 'dispatchAttempts.$.respondedAt': new Date() } }
  );
  await dispatchOrder(orderId);
}

/**
 * Called when a rider goes offline — immediately re-dispatches any pending
 * order that was sent to this rider and hasn't been accepted yet.
 */
export async function handleRiderWentOffline(riderId: string): Promise<void> {
  const order = await Order.findOne({
    status: 'pending',
    'dispatchAttempts': {
      $elemMatch: {
        riderId: new mongoose.Types.ObjectId(riderId),
        outcome: 'timeout', // still waiting on this rider
      },
    },
  }).select('_id dispatchAttempts');

  if (!order) return;

  // Mark the pending attempt as timed out with respondedAt
  const attempt = order.dispatchAttempts.find(
    (a) => a.riderId.toString() === riderId && a.outcome === 'timeout'
  );
  if (attempt) {
    attempt.outcome     = 'timeout';
    attempt.respondedAt = new Date();
    await order.save();
  }

  console.log(`[Dispatch] Rider ${riderId} went offline — re-dispatching order ${order._id}`);
  await dispatchOrder(order._id.toString());
}

async function escalateToAdmin(orderId: string, reason: string): Promise<void> {
  await Order.findByIdAndUpdate(orderId, {
    $push: {
      statusHistory: {
        status:      'pending',
        triggeredBy: 'system',
        timestamp:   new Date(),
        note:        `Escalated to admin — ${reason}`,
      },
    },
  });

  console.warn(`[Dispatch] Order ${orderId} escalated — ${reason}`);

  // Notify all active admins via SMS
  try {
    const admins = await Admin.find({ isActive: true }).select('phone').lean();
    const shortId = orderId.slice(-6).toUpperCase();
    await Promise.allSettled(
      admins.map((admin) =>
        sendSMS(
          admin.phone,
          `GetGas ALERT: Order #${shortId} needs manual rider assignment. Reason: ${reason}. Login to admin dashboard.`
        )
      )
    );
  } catch (err) {
    console.error('[Dispatch] Admin SMS escalation failed:', err);
  }

  // Emit to admin socket room
  try {
    io?.to('admin').emit('order:escalated', { orderId, reason, timestamp: new Date() });
  } catch (err) {
    console.error('[Dispatch] Admin socket emit failed:', err);
  }
}
