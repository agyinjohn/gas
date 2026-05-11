import cron from 'node-cron';
import { Order } from '../models/Order';
import { Station } from '../models/Station';
import { sendSMS, sendPushNotification } from '../services/notificationService';

/**
 * Cancel orders stuck in 'pending' for more than 15 minutes (no rider accepted).
 * Excludes scheduled orders.
 */
export function startOrderCleanupJob(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
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

        // Restore station stock for each line item
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

        // Trigger refund for captured payments
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

        // console.log(`[Cron] Auto-cancelled order ${order._id}`);
      }
    } catch (err) {
      console.error('[Cron] Order cleanup error:', err);
    }
  });

  // console.log('⏰ Order cleanup cron started (every 30s)');
}

/**
 * Check stations for low stock and send alerts — runs every hour.
 */
export function startLowStockAlertJob(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const stations = await Station.find({ status: 'active' });
      for (const station of stations) {
        for (const listing of station.cylinderListings) {
          if (listing.isAvailable && listing.stockCount <= listing.lowStockThreshold) {
            // Notify station owner via push / SMS (if fcmToken set)
            if (station.fcmToken) {
              await sendPushNotification(station.fcmToken, {
                title: '⚠️ Low Stock Alert',
                body: `Your ${listing.size}kg cylinder stock is low (${listing.stockCount} remaining)`,
                data: { screen: 'inventory', size: String(listing.size) },
              });
            }
            // console.log(
            //   `[Cron] Low stock alert: Station ${station.name}, ${listing.size}kg = ${listing.stockCount}`
            // );
          }
        }
      }
    } catch (err) {
      console.error('[Cron] Low stock alert error:', err);
    }
  });

  // console.log('⏰ Low stock alert cron started (every 30s)');
}

/**
 * Pick up scheduled orders that are due and dispatch them — runs every minute.
 */
export function startScheduledDispatchJob(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      // Find scheduled orders whose time has come (within the next 2 minutes window)
      const due = await Order.find({
        status: 'scheduled',
        scheduledFor: { $lte: new Date(now.getTime() + 2 * 60 * 1000) },
      });

      for (const order of due) {
        // Transition to pending and dispatch
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

        // Notify user
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

        // console.log(`[Cron] Dispatched scheduled order ${order._id}`);
      }
    } catch (err) {
      console.error('[Cron] Scheduled dispatch error:', err);
    }
  });

  // console.log('⏰ Scheduled dispatch cron started (every 30s)');
}

/**
 * Retry dispatch for pending orders that exhausted MAX_DISPATCH_ATTEMPTS.
 * Resets dispatchAttempts so the full rider pool is tried again — runs every 2 minutes.
 */
export function startUnassignedOrdersRetryJob(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const { CONSTANTS } = await import('../config/constants');
      const { dispatchOrder } = await import('../services/dispatchService');

      // Always log available riders and pending orders for visibility
      const { Rider } = await import('../models/Rider');
      const availableRiders = await Rider.find({ status: 'available', kycStatus: 'approved' })
        .select('name phone status location')
        .lean();
      // console.log(`[Cron:Retry] Available riders (${availableRiders.length}):`);
      // availableRiders.forEach((r: any) => {
      //   const loc = r.location
      //     ? `lat=${r.location.lat}, lng=${r.location.lng}, updated=${r.location.updatedAt}`
      //     : 'NO LOCATION';
      //   console.log(`  → ${r.name} (${r.phone}) | ${loc}`);
      // });

      const allPending = await Order.find({ status: 'pending', isScheduled: { $ne: true } }).select('_id dispatchAttempts').lean();
      // console.log(`[Cron:Retry] Pending unassigned orders (${allPending.length}):`);
      // allPending.forEach((o: any) => {
      //   console.log(`  → Order ${o._id} | attempts: ${o.dispatchAttempts?.length ?? 0}`);
      // });

      const stuckOrders = await Order.find({
        status: 'pending',
        isScheduled: { $ne: true },
        [`dispatchAttempts.${CONSTANTS.MAX_DISPATCH_ATTEMPTS - 1}`]: { $exists: true },
      }).select('_id dispatchAttempts statusHistory');

      if (stuckOrders.length === 0) return;

      // console.log(`[Cron:Retry] Retrying dispatch for ${stuckOrders.length} stuck order(s)`);

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
        // console.log(`[Cron] Re-queued order ${order._id}`);
      }
    } catch (err) {
      console.error('[Cron] Unassigned orders retry error:', err);
    }
  });

  // console.log('⏰ Unassigned orders retry cron started (every 30s)');
}

export function startAllJobs(): void {
  startOrderCleanupJob();
  startLowStockAlertJob();
  startScheduledDispatchJob();
  startUnassignedOrdersRetryJob();
}
