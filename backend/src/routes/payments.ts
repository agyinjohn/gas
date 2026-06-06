import { Router, Request, Response } from 'express';
import express from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order';
import { verifyPayment } from '../services/paymentService';
import { dispatchOrder } from '../services/dispatchService';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendSMS, SMS_TEMPLATES } from '../services/notificationService';

const router = Router();

// ─── Webhook (Paystack → server, HMAC-verified) ───────────────────────────────
// This is the ONLY place that marks an order as captured and triggers dispatch.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const { event, data } = JSON.parse(rawBody.toString());

  if (event === 'charge.success') {
    const order = await Order.findOne({ paystackReference: data.reference });

    if (order && order.paymentStatus === 'pending' && order.status === 'awaiting_payment') {
      // Verify the amount Paystack reports matches what we expect (pesewas)
      const expectedPesewas = Math.round((order.totalAmount - (order.loyaltyDiscount ?? 0)) * 100);
      if (data.amount !== expectedPesewas) {
        console.error(`[Webhook] Amount mismatch for ${data.reference}: expected ${expectedPesewas}, got ${data.amount}`);
        // Still respond 200 so Paystack doesn't retry, but do not capture
        return res.json({ status: 'ok' });
      }

      order.paymentStatus = 'captured';
      order.status = order.isScheduled ? 'scheduled' : 'pending';
      order.statusHistory.push({
        status: order.status,
        triggeredBy: 'system',
        timestamp: new Date(),
        note: `Payment captured via webhook — ref: ${data.reference}`,
      });
      await order.save();

      // Notify user that order is placed
      await Notification.create({
        userId:  order.userId,
        orderId: order._id,
        type:    'order_placed',
        title:   'Order Placed 📦',
        body:    `Your order #${order._id.toString().slice(-8).toUpperCase()} has been placed and is being processed.`,
      }).catch(console.error);

      // Send OTP via SMS — customer will show it to rider at delivery
      const user = await User.findById(order.userId).select('phone');
      if (user?.phone) {
        sendSMS(user.phone, SMS_TEMPLATES.deliveryOtp(order.otpCode))
          .catch(console.error);
      }

      // Dispatch rider — skip for scheduled orders
      if (!order.isScheduled) {
        dispatchOrder(order._id.toString()).catch(console.error);
      }
    }
  }

  if (event === 'transfer.failed' || event === 'transfer.reversed') {
    console.error(`[Webhook] Payout ${event} for reference ${data.reference}`);
    // TODO: alert admin and retry payout
  }

  res.json({ status: 'ok' });
});

// ─── Verify (client-facing, read-only) ───────────────────────────────────────
// Returns the current payment + order status for the UI to poll.
// Does NOT write to the DB — the webhook is the trusted source.
router.get('/verify/:reference', async (req: Request, res: Response) => {
  const result = await verifyPayment(req.params.reference);
  const order = await Order.findOne(
    { paystackReference: req.params.reference },
    'status paymentStatus _id'
  );

  res.json({
    success: true,
    payment: result,
    orderStatus: order?.status ?? null,
    paymentStatus: order?.paymentStatus ?? null,
  });
});

// ─── Retry Payment ────────────────────────────────────────────────────────────
// Allows a user to re-initialize Paystack for an order that is still
// awaiting_payment (i.e. they abandoned or the payment failed).
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { User } from '../models/User';
import { initializePayment, generatePaymentReference } from '../services/paymentService';

router.post('/retry/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.orderId);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Only the order owner can retry
  if (order.userId.toString() !== req.user!.id) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Only allow retry when payment is still pending and order is awaiting payment
  if (order.status !== 'awaiting_payment' || order.paymentStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'This order is not awaiting payment',
    });
  }

  const user = await User.findById(req.user!.id).select('email phone');
  const reference = generatePaymentReference(order._id.toString());
  const finalAmount = +(order.totalAmount - (order.loyaltyDiscount ?? 0)).toFixed(2);

  const payment = await initializePayment({
    email: user?.email || `${user?.phone}@GetGas.app`,
    amountGHS: finalAmount,
    reference,
    callbackUrl: `${process.env.FRONTEND_URL}/payment/callback?orderId=${order._id}`,
    metadata: { orderId: order._id.toString() },
    mobileNumber: order.paymentMethod === 'mobile_money' ? user?.phone : undefined,
  });

  // Update reference so webhook can match the new transaction
  order.paystackReference = reference;
  await order.save();

  res.json({ success: true, payment });
});

export default router;
