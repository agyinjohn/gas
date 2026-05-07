import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Rider } from '../models/Rider';
import { CONSTANTS } from '../config/constants';
import { getNearbyRiders } from './geoService';
import { emitOrderToRider, emitOrderToStation } from './realtimeService';
import { sendPushNotification } from './notificationService';

/**
 * Attempt to dispatch an order to the nearest available rider.
 * Tries up to MAX_DISPATCH_ATTEMPTS riders before escalating to admin.
 */
export async function dispatchOrder(orderId: string): Promise<void> {
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

  const nearbyRiders = await getNearbyRiders(station.lat, station.lng, CONSTANTS.DISPATCH_RADIUS_KM);
  console.log(`[Dispatch] Nearby riders (geo, ${CONSTANTS.DISPATCH_RADIUS_KM}km): ${nearbyRiders.length}`);

  // Filter out riders already attempted
  const attemptedIds = new Set(order.dispatchAttempts.map((a) => a.riderId.toString()));
  let eligibleRiders = nearbyRiders.filter((r) => !attemptedIds.has(r.riderId));
  console.log(`[Dispatch] Eligible after filtering attempted: ${eligibleRiders.length}`);

  // Fallback: if no nearby riders found (e.g. no GPS data in dev), use any available approved rider
  if (eligibleRiders.length === 0) {
    const allRiders = await Rider.find({
      status: 'available',
      kycStatus: 'approved',
      _id: { $nin: [...attemptedIds].map((id) => new mongoose.Types.ObjectId(id)) },
    }).select('_id name status kycStatus location').lean();

    console.log(`[Dispatch] Fallback — all available+approved riders in DB: ${allRiders.length}`);
    allRiders.forEach((r: any) => {
      console.log(`  Rider: ${r.name} | status: ${r.status} | kyc: ${r.kycStatus} | location: ${JSON.stringify(r.location ?? 'none')}`);
    });

    eligibleRiders = allRiders.map((r) => ({ riderId: r._id.toString(), distanceKm: 0 }));
  }

  if (eligibleRiders.length === 0) {
    console.log(`[Dispatch] No eligible riders at all — escalating`);
    await escalateToAdmin(orderId);
    return;
  }

  // Find the first truly available rider
  let rider = null;
  for (const candidate of eligibleRiders) {
    const r = await Rider.findOne({ _id: candidate.riderId, status: 'available', kycStatus: 'approved' });
    console.log(`[Dispatch] Checking candidate ${candidate.riderId}: ${r ? `found (${r.name})` : 'not available/approved'}`);
    if (r) { rider = r; break; }
  }

  if (!rider) {
    console.log(`[Dispatch] No available+approved rider found — escalating`);
    await escalateToAdmin(orderId);
    return;
  }

  console.log(`[Dispatch] Selected rider: ${rider.name} (${rider._id}) — emitting order:new to room rider:${rider._id}`);
  order.dispatchAttempts.push({
    riderId: rider._id,
    sentAt: new Date(),
    outcome: 'timeout',
  });
  await order.save();

  const attemptIndex = order.dispatchAttempts.length - 1;

  // Notify rider via socket + push
  const orderSummary = {
    orderId: order._id.toString(),
    cylinders: order.cylinders,
    orderType: order.orderType,
    deliveryAddress: order.deliveryAddress,
    earning: +(order.stationPayout * 0.15).toFixed(2),
    timeoutSeconds: CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS / 1000,
  };

  emitOrderToRider(rider._id.toString(), orderSummary);
  console.log(`[Dispatch] Socket emitted order:new to rider:${rider._id} — room size: ${(require('./realtimeService').io as any)?.sockets?.adapter?.rooms?.get('rider:' + rider._id.toString())?.size ?? 0} connected clients`);

  if (rider.fcmToken) {
    const sizes = order.cylinders.map((c) => `${c.quantity}×${c.size}kg`).join(', ');
    await sendPushNotification(rider.fcmToken, {
      title: 'New Delivery Order',
      body: `${sizes} — ${order.orderType}. GH₵${orderSummary.earning}. Tap to accept.`,
      data: { orderId: order._id.toString(), screen: 'OrderAccept' },
    });
  }

  // Notify station of incoming order
  emitOrderToStation(station._id.toString(), {
    orderId: order._id.toString(),
    cylinders: order.cylinders,
    orderType: order.orderType,
    deliveryAddress: order.deliveryAddress,
    riderName: rider.name,
  });

  // Timeout — if rider hasn't accepted, try next
  setTimeout(async () => {
    try {
      const freshOrder = await Order.findById(orderId);
      if (!freshOrder || freshOrder.status !== 'pending') return;

      // Mark this attempt as timed out (it was already set to 'timeout', just ensure it's saved)
      const attempt = freshOrder.dispatchAttempts[attemptIndex];
      if (attempt && attempt.riderId.toString() === rider!._id.toString()) {
        attempt.outcome = 'timeout';
        await freshOrder.save();
      }

      // Try next rider
      await dispatchOrder(orderId);
    } catch (err) {
      console.error('[Dispatch] Timeout handler error:', err);
    }
  }, CONSTANTS.ORDER_ACCEPT_TIMEOUT_MS);
}

/**
 * Called by the rider's accept action (PATCH /orders/:id/status → accepted).
 * Updates the dispatch attempt outcome to 'accepted'.
 */
export async function markDispatchAccepted(orderId: string, riderId: string): Promise<void> {
  await Order.updateOne(
    { _id: orderId, 'dispatchAttempts.riderId': new mongoose.Types.ObjectId(riderId) },
    { $set: { 'dispatchAttempts.$.outcome': 'accepted' } }
  );
}

/**
 * Called when a rider explicitly declines an order.
 * Updates outcome and immediately tries the next rider.
 */
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
        note: 'Escalated to admin — no riders available',
      },
    },
  });
  console.warn(`[Dispatch] Order ${orderId} escalated to admin — no riders available`);
  // TODO: emit to admin socket room + send admin push/email alert
}
