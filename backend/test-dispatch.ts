/**
 * test-dispatch.ts
 * Run: npx ts-node test-dispatch.ts
 *
 * 1. Connects to MongoDB
 * 2. Ensures a test user, station (active, stocked), and rider (available, approved, near station) exist
 * 3. Mints a JWT for the test user
 * 4. POSTs an order to the running server (localhost:4000)
 * 5. Polls the order every 3 s for up to 90 s and prints dispatch progress
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const API = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET!;
const MONGO_URI  = process.env.MONGODB_URI!;

// ── Inline minimal schemas (avoid importing compiled app models) ──────────────
const UserSchema = new mongoose.Schema({ name: String, phone: String, role: String, loyaltyPoints: Number, totalOrders: Number, isActive: Boolean }, { strict: false });
const StationSchema = new mongoose.Schema({}, { strict: false });
const RiderSchema   = new mongoose.Schema({}, { strict: false });
const OrderSchema   = new mongoose.Schema({}, { strict: false });

const User    = mongoose.models.User    || mongoose.model('User',    UserSchema);
const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);
const Rider   = mongoose.models.Rider   || mongoose.model('Rider',   RiderSchema);
const Order   = mongoose.models.Order   || mongoose.model('Order',   OrderSchema);

// ── Coordinates: place station + rider at the same spot ──────────────────────
const LAT = 5.6037;   // Accra
const LNG = -0.1870;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // ── 1. Test user ─────────────────────────────────────────────────────────
  let user = await User.findOne({ phone: '+233000000001' });
  if (!user) {
    user = await User.create({
      name: 'Test User', phone: '+233000000001', role: 'user',
      loyaltyPoints: 0, totalOrders: 0, isActive: true,
    });
    console.log('👤 Created test user:', user._id);
  } else {
    console.log('👤 Using existing user:', user._id);
  }

  // ── 2. Test station ───────────────────────────────────────────────────────
  let station = await Station.findOne({ name: 'Test Station Alpha' });
  const dayHours = { open: '00:00', close: '23:59', isOpen: true };
  const listing  = { size: 6, brand: 'K-Gas', fillType: 'LPG', fillPrice: 80, exchangePrice: 60, stockCount: 10, needsRefillCount: 0, lowStockThreshold: 2, isPaused: false, isAvailable: true };

  if (!station) {
    station = await Station.create({
      ownerId: user._id, name: 'Test Station Alpha',
      address: '1 Test St', city: 'Accra',
      lat: LAT, lng: LNG, geohash: 's0bq',
      status: 'active', commissionPct: 10,
      ratingAvg: 0, totalRatings: 0, totalOrders: 0,
      cylinderListings: [listing],
      operatingHours: { mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours },
    });
    console.log('🏪 Created test station:', station._id);
  } else {
    // Ensure stock + open
    await Station.updateOne({ _id: station._id }, {
      $set: {
        status: 'active',
        'cylinderListings.0.stockCount': 10,
        'cylinderListings.0.isAvailable': true,
        'cylinderListings.0.isPaused': false,
        'operatingHours.mon.isOpen': true,
        'operatingHours.tue.isOpen': true,
        'operatingHours.wed.isOpen': true,
        'operatingHours.thu.isOpen': true,
        'operatingHours.fri.isOpen': true,
        'operatingHours.sat.isOpen': true,
        'operatingHours.sun.isOpen': true,
      },
    });
    console.log('🏪 Using existing station:', station._id);
  }

  // ── 3. Test rider ─────────────────────────────────────────────────────────
  let rider = await Rider.findOne({ phone: '+233000000099' });
  if (!rider) {
    rider = await Rider.create({
      name: 'Test Rider', phone: '+233000000099',
      nationalId: 'GHA-TEST-001', vehicleType: 'motorbike', vehiclePlate: 'TEST-001',
      kycStatus: 'approved', status: 'available', isActive: true,
      location: { lat: LAT, lng: LNG, updatedAt: new Date() },
      totalTrips: 0, ratingAvg: 0, totalRatings: 0, totalEarnings: 0,
    });
    console.log('🏍️  Created test rider:', rider._id);
  } else {
    await Rider.updateOne({ _id: rider._id }, {
      $set: {
        kycStatus: 'approved', status: 'available',
        'location.lat': LAT, 'location.lng': LNG, 'location.updatedAt': new Date(),
        currentOrderId: null,
      },
    });
    console.log('🏍️  Using existing rider:', rider._id, '→ reset to available');
  }

  // ── 4. Mint JWT ───────────────────────────────────────────────────────────
  const token = jwt.sign({ id: user._id.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  // ── 5. Place order ────────────────────────────────────────────────────────
  console.log('\n📦 Placing order...');
  let orderId: string;
  try {
    const { data } = await axios.post(
      `${API}/orders`,
      {
        stationId: station._id.toString(),
        cylinders: [{ size: 6, quantity: 1 }],
        orderType: 'delivery',
        deliveryAddress: { street: '5 Test Ave', city: 'Accra', lat: LAT + 0.001, lng: LNG + 0.001 },
        paymentMethod: 'cash',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    orderId = data.order.id;
    console.log('✅ Order created:', orderId);
    console.log('   Status:', data.order.status);
  } catch (err: any) {
    console.error('❌ Order creation failed:', err.response?.data || err.message);
    await mongoose.disconnect();
    return;
  }

  // ── 6. Poll for dispatch ──────────────────────────────────────────────────
  console.log('\n⏳ Polling order every 3 s (up to 90 s)...\n');
  const deadline = Date.now() + 90_000;
  let lastStatus = '';
  let lastAttempts = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const order = await Order.findById(orderId).lean() as any;
    if (!order) { console.log('Order not found'); break; }

    const attempts = order.dispatchAttempts?.length ?? 0;
    const status   = order.status;

    if (status !== lastStatus || attempts !== lastAttempts) {
      console.log(`[${new Date().toLocaleTimeString()}] status=${status}  dispatchAttempts=${attempts}  riderId=${order.riderId ?? 'none'}`);

      if (attempts > lastAttempts) {
        const last = order.dispatchAttempts[attempts - 1];
        console.log(`   └─ attempt #${attempts}: rider=${last.riderId}  outcome=${last.outcome}`);
      }

      lastStatus   = status;
      lastAttempts = attempts;
    }

    if (['accepted', 'cancelled', 'delivered'].includes(status)) {
      console.log('\n🏁 Terminal status reached:', status);
      break;
    }

    if (attempts >= 3 && status === 'pending') {
      console.log('\n⚠️  Max dispatch attempts reached — escalated to admin');
      break;
    }
  }

  // ── 7. Final state ────────────────────────────────────────────────────────
  const final = await Order.findById(orderId).lean() as any;
  console.log('\n── Final order state ──────────────────────────────');
  console.log('  status          :', final?.status);
  console.log('  riderId         :', final?.riderId ?? 'unassigned');
  console.log('  dispatchAttempts:', JSON.stringify(final?.dispatchAttempts, null, 2));

  const riderFinal = await Rider.findById(rider._id).lean() as any;
  console.log('\n── Rider final state ──────────────────────────────');
  console.log('  status          :', riderFinal?.status);
  console.log('  currentOrderId  :', riderFinal?.currentOrderId ?? 'none');

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

run().catch((err) => { console.error(err); process.exit(1); });
