import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Station } from '../models/Station';
import { Rider } from '../models/Rider';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { PricingConfig } from '../models/PricingConfig';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { initiateRefund } from '../services/paymentService';
import { emitOrderStatus } from '../services/realtimeService';
import { sendPushNotification, sendSMS, SMS_TEMPLATES } from '../services/notificationService';
import { encodeGeohash } from '../services/geoService';

const router = Router();
router.use(authenticate, requireRole('admin'));

function ve(req: any, res: Response): boolean {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ success: false, errors: e.array() }); return true; }
  return false;
}

// ─── Platform Metrics ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/metrics:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform-wide metrics
 *     responses:
 *       200:
 *         description: Orders, stations, riders, financials, users stats
 */
router.get('/metrics', async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders, todayOrders,
    activeStations, pendingStations,
    activeRiders, pendingRiders,
    gmvResult, avgOrderValue,
    newUsersToday,
  ] = await Promise.all([
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: 'delivered', createdAt: { $gte: startOfDay } }),
    Station.countDocuments({ status: 'active' }),
    Station.countDocuments({ status: 'pending' }),
    Rider.countDocuments({ status: { $in: ['available', 'busy'] } }),
    Rider.countDocuments({ kycStatus: 'pending' }),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, gmv: { $sum: '$totalAmount' }, commission: { $sum: '$commissionAmount' } } },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
    ]),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
  ]);

  res.json({
    success: true,
    metrics: {
      orders: { total: totalOrders, today: todayOrders },
      stations: { active: activeStations, pending: pendingStations },
      riders: { active: activeRiders, pendingKYC: pendingRiders },
      financials: {
        monthGMV: gmvResult[0]?.gmv || 0,
        monthCommission: gmvResult[0]?.commission || 0,
        avgOrderValue: avgOrderValue[0]?.avg || 0,
      },
      users: { newToday: newUsersToday },
    },
  });
});

// Weekly trend endpoint
router.get('/metrics/weekly', async (_req: AuthRequest, res: Response) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    trend,
    cylinderSizes,
    paymentMethods,
    topStations,
    topRiders,
    fulfillment,
    thisMonthOrders,
    lastMonthOrders,
    thisMonthRevenue,
    lastMonthRevenue,
    hourlyDist,
  ] = await Promise.all([
    // 7-day daily trend
    Promise.all(days.map(async (day) => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const [result] = await Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: day, $lt: next } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' }, commission: { $sum: '$commissionAmount' } } },
      ]);
      return {
        day: day.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric' }),
        orders: result?.orders || 0,
        revenue: +(result?.revenue || 0).toFixed(2),
        commission: +(result?.commission || 0).toFixed(2),
      };
    })),

    // Cylinder size popularity
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$cylinders' },
      { $group: { _id: '$cylinders.size', count: { $sum: '$cylinders.quantity' }, revenue: { $sum: '$cylinders.subtotal' } } },
      { $sort: { count: -1 } },
    ]),

    // Payment method split
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
    ]),

    // Top 5 stations by revenue
    Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$stationId', orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'stations', localField: '_id', foreignField: '_id', as: 'station' } },
      { $unwind: '$station' },
      { $project: { name: '$station.name', city: '$station.city', orders: 1, revenue: 1 } },
    ]),

    // Top 5 riders by trips
    Order.aggregate([
      { $match: { status: 'delivered', riderId: { $exists: true } } },
      { $group: { _id: '$riderId', trips: { $sum: 1 }, earnings: { $sum: { $multiply: ['$stationPayout', 0.15] } } } },
      { $sort: { trips: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'riders', localField: '_id', foreignField: '_id', as: 'rider' } },
      { $unwind: '$rider' },
      { $project: { name: '$rider.name', trips: 1, earnings: 1, ratingAvg: '$rider.ratingAvg' } },
    ]),

    // Fulfillment rate
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // This month orders
    Order.countDocuments({ status: 'delivered', createdAt: { $gte: startOfMonth } }),
    // Last month orders
    Order.countDocuments({ status: 'delivered', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

    // This month revenue
    Order.aggregate([{ $match: { status: 'delivered', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, v: { $sum: '$totalAmount' } } }]),
    // Last month revenue
    Order.aggregate([{ $match: { status: 'delivered', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, v: { $sum: '$totalAmount' } } }]),

    // Hourly distribution (last 30 days)
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]),
  ]);

  // Compute fulfillment rate
  const statusMap: Record<string, number> = {};
  for (const s of fulfillment) statusMap[s._id] = s.count;
  const totalAll = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const deliveredCount = statusMap['delivered'] || 0;
  const cancelledCount = statusMap['cancelled'] || 0;
  const fulfillmentRate = totalAll > 0 ? +((deliveredCount / totalAll) * 100).toFixed(1) : 0;

  // MoM growth
  const lastMonthRev = lastMonthRevenue[0]?.v || 0;
  const thisMonthRev = thisMonthRevenue[0]?.v || 0;
  const revenueGrowth = lastMonthRev > 0 ? +(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1) : null;
  const ordersGrowth = lastMonthOrders > 0 ? +(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100).toFixed(1) : null;

  // Fill missing hours with 0
  const hourMap: Record<number, number> = {};
  for (const h of hourlyDist) hourMap[h._id] = h.count;
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    orders: hourMap[i] || 0,
  }));

  res.json({
    success: true,
    trend,
    cylinderSizes: cylinderSizes.map((c: any) => ({ size: `${c._id}kg`, count: c.count, revenue: +c.revenue.toFixed(2) })),
    paymentMethods: paymentMethods.map((p: any) => ({ method: p._id?.replace('_', ' '), count: p.count, revenue: +p.revenue.toFixed(2) })),
    topStations: topStations.map((s: any) => ({ name: s.name, city: s.city, orders: s.orders, revenue: +s.revenue.toFixed(2) })),
    topRiders: topRiders.map((r: any) => ({ name: r.name, trips: r.trips, earnings: +r.earnings.toFixed(2), rating: +r.ratingAvg.toFixed(1) })),
    fulfillment: { rate: fulfillmentRate, delivered: deliveredCount, cancelled: cancelledCount, total: totalAll },
    growth: { revenueGrowth, ordersGrowth, thisMonthOrders, lastMonthOrders, thisMonthRev: +thisMonthRev.toFixed(2), lastMonthRev: +lastMonthRev.toFixed(2) },
    hourlyData,
  });
});

// ─── Station Management ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/stations:
 *   get:
 *     tags: [Admin]
 *     summary: List all stations with optional status filter
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, active, suspended, banned] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated stations
 */
router.get('/stations', async (req: AuthRequest, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter = status ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [stations, total] = await Promise.all([
    Station.find(filter).populate('ownerId', 'name phone').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Station.countDocuments(filter),
  ]);

  res.json({ success: true, stations, pagination: { page: parseInt(page), total } });
});

// Admin create station + owner account
router.post('/stations',
  [
    body('ownerName').trim().notEmpty(),
    body('ownerPhone').trim().isMobilePhone('any'),
    body('ownerPassword').isLength({ min: 6 }),
    body('stationName').trim().notEmpty(),
    body('address').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
    body('commissionPct').optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { ownerName, ownerPhone, ownerPassword, stationName, address, city, lat, lng, commissionPct } = req.body;

    const { User } = await import('../models/User');
    const { encodeGeohash } = await import('../services/geoService');
    const bcrypt = await import('bcryptjs');

    if (await User.findOne({ phone: ownerPhone })) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const owner = await User.create({ phone: ownerPhone, name: ownerName, isVerified: true, passwordHash });

    const station = await Station.create({
      ownerId: owner._id,
      name: stationName,
      address,
      city,
      lat,
      lng,
      geohash: encodeGeohash(lat, lng, 7),
      status: 'active',
      commissionPct: commissionPct ?? 10,
    });

    res.status(201).json({ success: true, station, owner: { id: owner._id, name: owner.name, phone: owner.phone } });
  }
);

/**
 * @swagger
 * /api/v1/admin/stations/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve, suspend or ban a station
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, suspended, banned] }
 *     responses:
 *       200:
 *         description: Updated station
 */
router.patch(
  '/stations/:id/status',
  [body('status').isIn(['active', 'suspended', 'banned'])],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;
    const station = await Station.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    res.json({ success: true, station });
  }
);

/**
 * @swagger
 * /api/v1/admin/stations/{id}/commission:
 *   patch:
 *     tags: [Admin]
 *     summary: Set platform commission % for a station
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [commissionPct]
 *             properties:
 *               commissionPct: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Updated station
 */
router.patch(
  '/stations/:id/commission',
  [body('commissionPct').isFloat({ min: 0, max: 100 })],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;
    const station = await Station.findByIdAndUpdate(
      req.params.id,
      { commissionPct: req.body.commissionPct },
      { new: true }
    );
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    res.json({ success: true, station });
  }
);

/**
 * @swagger
 * /api/v1/admin/stations/{id}/location:
 *   patch:
 *     tags: [Admin]
 *     summary: Override station geolocation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng]
 *             properties:
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       200:
 *         description: Updated station
 */
router.patch(
  '/stations/:id/location',
  [
    param('id').isMongoId(),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;
    const { lat, lng } = req.body;
    const station = await Station.findByIdAndUpdate(
      req.params.id,
      { lat, lng, geohash: encodeGeohash(lat, lng, 7) },
      { new: true }
    );
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    res.json({ success: true, station });
  }
);

// ─── Rider Management ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/riders:
 *   get:
 *     tags: [Admin]
 *     summary: List riders with optional KYC status filter
 *     parameters:
 *       - in: query
 *         name: kycStatus
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated riders
 */
router.get('/riders', async (req: AuthRequest, res: Response) => {
  const { kycStatus, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter = kycStatus ? { kycStatus } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [riders, total] = await Promise.all([
    Rider.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-passwordHash'),
    Rider.countDocuments(filter),
  ]);

  res.json({ success: true, riders, pagination: { page: parseInt(page), total } });
});

/**
 * @swagger
 * /api/v1/admin/riders/{id}/kyc:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve or reject rider KYC (notifies rider via SMS + push)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kycStatus]
 *             properties:
 *               kycStatus: { type: string, enum: [approved, rejected] }
 *               reason:    { type: string }
 *     responses:
 *       200:
 *         description: Updated rider
 */
router.patch(
  '/riders/:id/kyc',
  [
    param('id').isMongoId(),
    body('kycStatus').isIn(['approved', 'rejected']),
    body('reason').optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;

    const { kycStatus, reason } = req.body;
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      { kycStatus, ...(reason && { kycRejectionReason: reason }) },
      { new: true }
    );
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });

    // Notify rider via SMS + push
    const smsText = kycStatus === 'approved'
      ? `GetGas: Your KYC has been approved! You can now go online and start delivering.`
      : `GetGas: Your KYC was not approved. Reason: ${reason || 'Please contact support.'}`;

    await sendSMS(rider.phone, smsText).catch(console.error);

    if (rider.fcmToken) {
      await sendPushNotification(rider.fcmToken, {
        title: kycStatus === 'approved' ? '✅ KYC Approved' : '❌ KYC Rejected',
        body: smsText,
        data: { screen: 'profile' },
      }).catch(console.error);
    }

    res.json({ success: true, rider });
  }
);

/**
 * @swagger
 * /api/v1/admin/riders/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspend or ban a rider (forces offline)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, suspended, banned] }
 *     responses:
 *       200:
 *         description: Updated rider
 */
router.patch(
  '/riders/:id/status',
  [param('id').isMongoId(), body('status').isIn(['active', 'suspended', 'banned'])],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;
    const { status } = req.body;
    const update: Record<string, unknown> = { isActive: status === 'active' };
    // Force offline if suspended/banned
    if (status !== 'active') update.status = 'offline';

    const rider = await Rider.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.json({ success: true, rider });
  }
);

// ─── Order Management / Disputes ─────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders (dispute management)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, at_station, en_route, delivered, cancelled] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated orders
 */
router.get(
  '/orders',
  [
    query('status').optional().isIn(['pending', 'accepted', 'at_station', 'en_route', 'delivered', 'cancelled']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter = status ? { status } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'name phone')
        .populate('stationId', 'name address')
        .populate('riderId', 'name phone'),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, orders, pagination: { page: parseInt(page), total } });
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{id}/refund:
 *   post:
 *     tags: [Admin]
 *     summary: Manually trigger a Paystack refund for an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Refund initiated
 *       400:
 *         description: Already refunded, cash order, or no reference
 */
router.post(
  '/orders/:id/refund',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({ success: false, message: 'Order already refunded' });
    }
    if (order.paymentMethod === 'cash') {
      return res.status(400).json({ success: false, message: 'Cash orders cannot be refunded via platform' });
    }
    if (!order.paystackReference) {
      return res.status(400).json({ success: false, message: 'No payment reference found' });
    }

    await initiateRefund(order.paystackReference);
    order.paymentStatus = 'refunded';
    order.statusHistory.push({
      status: order.status,
      triggeredBy: 'admin',
      triggeredById: new mongoose.Types.ObjectId(req.user!.id),
      timestamp: new Date(),
      note: 'Manual refund issued by admin',
    });
    await order.save();

    res.json({ success: true, message: 'Refund initiated' });
  }
);

/**
 * @swagger
 * /api/v1/admin/orders/{id}/cancel:
 *   patch:
 *     tags: [Admin]
 *     summary: Force cancel any non-terminal order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled
 */
router.patch(
  '/orders/:id/cancel',
  [param('id').isMongoId(), body('reason').trim().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${order.status} order` });
    }

    order.status = 'cancelled';
    order.cancelledBy = 'admin';
    order.cancellationReason = req.body.reason;
    order.statusHistory.push({
      status: 'cancelled',
      triggeredBy: 'admin',
      triggeredById: new mongoose.Types.ObjectId(req.user!.id),
      timestamp: new Date(),
      note: req.body.reason,
    });

    // Restore stock for each line item
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

    // Free rider
    if (order.riderId) {
      await Rider.findByIdAndUpdate(order.riderId, { status: 'available', currentOrderId: null });
    }

    // Refund if captured
    if (order.paymentStatus === 'captured' && order.paystackReference) {
      await initiateRefund(order.paystackReference).catch(console.error);
      order.paymentStatus = 'refunded';
    }

    await order.save();
    emitOrderStatus(order._id.toString(), 'cancelled');

    res.json({ success: true, message: 'Order cancelled' });
  }
);

// ─── Pricing Controls ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/pricing:
 *   get:
 *     tags: [Admin]
 *     summary: Get current platform pricing config
 *     responses:
 *       200:
 *         description: Pricing config
 *   patch:
 *     tags: [Admin]
 *     summary: Update platform pricing (surge, delivery fee, caps, freeze)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryFeeFlat:   { type: number }
 *               surgeMultiplier:   { type: number, minimum: 1, maximum: 5 }
 *               surgeActive:       { type: boolean }
 *               surgeReason:       { type: string }
 *               priceFreezeActive: { type: boolean }
 *               minPriceCaps:      { type: array }
 *               maxPriceCaps:      { type: array }
 *     responses:
 *       200:
 *         description: Updated pricing config
 */
router.get('/pricing', async (_req: AuthRequest, res: Response) => {
  const config = await PricingConfig.findOne().sort({ createdAt: -1 });
  res.json({ success: true, pricing: config || {} });
});

/** PATCH /api/v1/admin/pricing */
router.patch(
  '/pricing',
  [
    body('deliveryFeeFlat').optional().isFloat({ min: 0 }),
    body('surgeMultiplier').optional().isFloat({ min: 1.0, max: 5.0 }),
    body('surgeActive').optional().isBoolean(),
    body('surgeReason').optional().isString(),
    body('priceFreezeActive').optional().isBoolean(),
    body('minPriceCaps').optional().isArray(),
    body('maxPriceCaps').optional().isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    if (ve(req, res)) return;

    const update = { ...req.body, updatedBy: req.user!.id };
    const config = await PricingConfig.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ success: true, pricing: config });
  }
);

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List users with optional search
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or phone
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated users
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-passwordHash'),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, users, pagination: { page: parseInt(page), total } });
});

export default router;
