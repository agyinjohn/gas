import cron from 'node-cron';
import { Order } from '../models/Order';
import { Station } from '../models/Station';
import { sendPushNotification } from '../services/notificationService';
import redis from '../config/redis';

async function withLock(key: string, ttlMs: number, fn: () => Promise<void>): Promise<void> {
  const acquired = await redis.set(`cron:lock:${key}`, '1', 'PX', ttlMs, 'NX');
  if (!acquired) return;
  try {
    await fn();
  } finally {
    await redis.del(`cron:lock:${key}`);
  }
}

export function startOrderCleanupJob(): void {
  cron.schedule('*/30 * * * * *', () =>
    withLock('order-cleanup', 25_000, async () => {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const stale = await Order.find({
        status: 'pending',
        isScheduled: { $ne: true },
        createdAt: { $lt: cutoff },
      });

      for (const order of stale) {
        order.status = 'cancelled';
        order.cancelledBy = 'system';
        order.cancellationReason = 'No rider available within 2 hours';
        order.statusHistory.push({
          status: 'cancelled',
          triggeredBy: 'system',
          timestamp: new Date(),
          note: 'Auto-cancelled: no rider assigned',
        });
        await order.save();

        const stationDoc = await Station.findById(order.stationId);
        if (stationDoc) {
          for (const item of order.cylinders) {
            const listing = stationDoc.cylinderListings.find((l) => l.size === item.size);
            if (listing) {
              listing.stockCount += item.quantity;
              listing.isAvailable = listing.stockCount > 0 && !listing.isPaused;
            }
          }
          await stationDoc.save();
        }

        if (order.paymentStatus === 'captured' && order.paystackReference) {
          try {
            const { initiateRefund } = await import('../services/paymentService');
            await initiateRefund(order.paystackReference);
            order.paymentStatus = 'refunded';
            await order.save();
          } catch (err) {
            console.error(`[Cron] Refund failed for order ${order._id}:`, err);
          }
        } else {
          order.paymentStatus = 'refunded';
          await order.save();
        }
      }
    })
  );
}

export function startLowStockAlertJob(): void {
  cron.schedule('*/30 * * * * *', () =>
    withLock('low-stock', 25_000, async () => {
      const stations = await Station.find({ status: 'active' });
      for (const station of stations) {
        for (const listing of station.cylinderListings) {
          if (listing.isAvailable && listing.stockCount <= listing.lowStockThreshold) {
            if (station.fcmToken) {
              await sendPushNotification(station.fcmToken, {
                title: '⚠️ Low Stock Alert',
                body: `Your ${listing.size}kg cylinder stock is low (${listing.stockCount} remaining)`,
                data: { screen: 'inventory', size: String(listing.size) },
              });
            }
          }
        }
      }
    })
  );
}

export function startScheduledDispatchJob(): void {
  cron.schedule('*/30 * * * * *', () =>
    withLock('scheduled-dispatch', 25_000, async () => {
      const now = new Date();
      const due = await Order.find({
        status: 'scheduled',
        scheduledFor: { $lte: new Date(now.getTime() + 2 * 60 * 1000) },
      });

      for (const order of due) {
        order.status = 'pending';
        order.statusHistory.push({
          status: 'pending',
          triggeredBy: 'system',
          timestamp: new Date(),
          note: 'Scheduled order dispatched',
        });
        await order.save();

        const { dispatchOrder } = await import('../services/dispatchService');
        dispatchOrder(order._id.toString()).catch(console.error);

        const { User } = await import('../models/User');
        const user = await User.findById(order.userId).select('fcmToken phone');
        if (user?.fcmToken) {
          const sizes = order.cylinders.map((c: any) => `${c.quantity}x${c.size}kg`).join(', ');
          await sendPushNotification(user.fcmToken, {
            title: '🔥 Your scheduled order is on its way!',
            body: `We're finding a rider for your ${sizes} delivery.`,
            data: { orderId: order._id.toString(), screen: 'OrderTracking' },
          });
        }
      }
    })
  );
}

export function startUnassignedOrdersRetryJob(): void {
  cron.schedule('*/30 * * * * *', () =>
    withLock('unassigned-retry', 25_000, async () => {
      const { CONSTANTS } = await import('../config/constants');
      const { dispatchOrder } = await import('../services/dispatchService');

      const stuckOrders = await Order.find({
        status: 'pending',
        isScheduled: { $ne: true },
        [`dispatchAttempts.${CONSTANTS.MAX_DISPATCH_ATTEMPTS - 1}`]: { $exists: true },
      }).select('_id dispatchAttempts statusHistory');

      if (stuckOrders.length === 0) return;

      for (const order of stuckOrders) {
        order.dispatchAttempts = [];
        order.statusHistory.push({
          status: 'pending',
          triggeredBy: 'system',
          timestamp: new Date(),
          note: 'Dispatch attempts reset — retrying rider assignment',
        });
        await order.save();
        dispatchOrder(order._id.toString()).catch(console.error);
      }
    })
  );
}

export function startAllJobs(): void {
  startOrderCleanupJob();
  startLowStockAlertJob();
  startScheduledDispatchJob();
  startUnassignedOrdersRetryJob();
  startPendingOrdersOnBoot();
}

export async function startPendingOrdersOnBoot(): Promise<void> {
  try {
    await new Promise((r) => setTimeout(r, 5000));

    const activeOrders = await Order.find(
      { status: { $in: ['accepted', 'at_station', 'en_route'] } },
      'riderId'
    ).lean();
    const activeRiderIds = new Set(activeOrders.map((o: any) => o.riderId?.toString()).filter(Boolean));
    const { Rider } = await import('../models/Rider');
    const allBusy = await Rider.find({ status: 'busy' }).select('_id').lean();
    for (const r of allBusy) {
      if (!activeRiderIds.has(r._id.toString())) {
        await Rider.findByIdAndUpdate(r._id, { status: 'available', currentOrderId: null });
        console.log(`[Boot] Fixed stuck busy rider: ${r._id}`);
      }
    }

    const pending = await Order.find({ status: 'pending', isScheduled: { $ne: true } }).select('_id').lean();
    if (pending.length === 0) return;
    console.log(`[Boot] Re-dispatching ${pending.length} pending order(s)`);
    const { dispatchOrder } = await import('../services/dispatchService');
    for (const order of pending) {
      dispatchOrder((order._id as any).toString()).catch(console.error);
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('[Boot] Pending orders re-dispatch error:', err);
  }
}
