/**
 * test-visca.ts
 * Run: npx ts-node test-visca.ts
 *
 * 1. Sets Visca's location to the real station coords + marks available + approved
 * 2. Opens a Socket.IO client as Visca and joins her rider room
 * 3. Mints a user JWT and POSTs a real order to the running server
 * 4. Waits to see if the socket receives 'order:new'
 * 5. Polls the DB to confirm dispatch attempt outcome
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { io as ioClient } from 'socket.io-client';

const API        = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET!;
const MONGO_URI  = process.env.MONGODB_URI!;

// Station coords (Asokwa LPG Station)
const STATION_LAT = 6.67;
const STATION_LNG = -1.61;

const OrderSchema  = new mongoose.Schema({}, { strict: false });
const RiderSchema  = new mongoose.Schema({}, { strict: false });
const UserSchema   = new mongoose.Schema({}, { strict: false });
const StationSchema = new mongoose.Schema({}, { strict: false });

const Order   = mongoose.models.Order   || mongoose.model('Order',   OrderSchema);
const Rider   = mongoose.models.Rider   || mongoose.model('Rider',   RiderSchema);
const User    = mongoose.models.User    || mongoose.model('User',    UserSchema);
const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // ── 1. Get Visca + the real station ──────────────────────────────────────
  const visca = await Rider.findOne({ name: 'Visca' }).lean() as any;
  if (!visca) { console.error('❌ Visca not found in DB'); process.exit(1); }

  const station = await Station.findOne({ name: 'Asokwa LPG Station' }).lean() as any;
  if (!station) { console.error('❌ Asokwa LPG Station not found'); process.exit(1); }

  console.log('🏍️  Visca ID     :', visca._id);
  console.log('🏪  Station ID   :', station._id);
  console.log('🏪  Station stock:', JSON.stringify(station.cylinderListings?.map((l: any) => ({ size: l.size, stock: l.stockCount, available: l.isAvailable }))));

  // ── 2. Set Visca available + approved + location at station ──────────────
  await Rider.updateOne({ _id: visca._id }, {
    $set: {
      status: 'available',
      kycStatus: 'approved',
      'location.lat': STATION_LAT,
      'location.lng': STATION_LNG,
      'location.updatedAt': new Date(),
      currentOrderId: null,
    },
  });
  console.log('\n✅ Visca set: available, approved, location =', STATION_LAT, STATION_LNG);

  // ── 3. Ensure station has stock ───────────────────────────────────────────
  const hasStock = station.cylinderListings?.some((l: any) => l.isAvailable && l.stockCount > 0);
  if (!hasStock) {
    await Station.updateOne(
      { _id: station._id, 'cylinderListings.size': 6 },
      { $set: { 'cylinderListings.$.stockCount': 10, 'cylinderListings.$.isAvailable': true, 'cylinderListings.$.isPaused': false } }
    );
    console.log('✅ Restocked station 6kg cylinders');
  }

  // ── 4. Open socket as Visca and join her rider room ───────────────────────
  const viscaToken = jwt.sign({ id: visca._id.toString(), role: 'rider' }, JWT_SECRET, { expiresIn: '1h' });
  const socket = ioClient(SOCKET_URL, {
    auth: { token: viscaToken },
    transports: ['websocket'],
  });

  let orderReceived = false;

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('\n🔌 Socket connected as Visca, joining rider room...');
      socket.emit('join:rider', visca._id.toString());
      resolve();
    });
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
  });

  socket.on('order:new', (payload: any) => {
    orderReceived = true;
    console.log('\n🎉 Visca received order:new event!');
    console.log('   orderId  :', payload.orderId);
    console.log('   cylinders:', JSON.stringify(payload.cylinders));
    console.log('   earning  : GH₵', payload.earning);
    console.log('   timeout  :', payload.timeoutSeconds, 's');
  });

  // ── 5. Get or create a test user ──────────────────────────────────────────
  let user = await User.findOne({ phone: '+233000000001' }).lean() as any;
  if (!user) {
    user = await User.create({ name: 'Test User', phone: '+233000000001', role: 'user', loyaltyPoints: 0, totalOrders: 0, isActive: true });
  }
  const userToken = jwt.sign({ id: user._id.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  // ── 6. Place the order ────────────────────────────────────────────────────
  console.log('\n📦 Placing order against Asokwa LPG Station...');

  // Find an available cylinder size from the station
  const availableListing = station.cylinderListings?.find((l: any) => l.isAvailable && l.stockCount > 0)
    ?? { size: 6 };

  let orderId: string;
  try {
    const { data } = await axios.post(
      `${API}/orders`,
      {
        stationId: station._id.toString(),
        cylinders: [{ size: availableListing.size, quantity: 1 }],
        orderType: 'delivery',
        deliveryAddress: { street: '10 Asokwa Rd', city: 'Kumasi', lat: STATION_LAT + 0.002, lng: STATION_LNG + 0.002 },
        paymentMethod: 'cash',
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    orderId = data.order.id;
    console.log('✅ Order created:', orderId, '| status:', data.order.status);
  } catch (err: any) {
    console.error('❌ Order failed:', err.response?.data || err.message);
    socket.disconnect();
    await mongoose.disconnect();
    return;
  }

  // ── 7. Wait up to 10 s for socket event, then poll DB ────────────────────
  console.log('\n⏳ Waiting for socket event (10 s)...');
  await new Promise((r) => setTimeout(r, 10000));

  if (!orderReceived) {
    console.log('⚠️  No socket event received within 10 s — checking DB...');
  }

  const order = await Order.findById(orderId).lean() as any;
  console.log('\n── DB dispatch result ─────────────────────────────────────────');
  console.log('  status          :', order?.status);
  console.log('  riderId         :', order?.riderId ?? 'unassigned');
  console.log('  dispatchAttempts:', order?.dispatchAttempts?.length ?? 0);
  for (const a of order?.dispatchAttempts ?? []) {
    const isVisca = a.riderId.toString() === visca._id.toString();
    console.log(`    ${isVisca ? '👤 Visca' : '     '} rider=${a.riderId}  outcome=${a.outcome}`);
  }

  const viscaFinal = await Rider.findById(visca._id).lean() as any;
  console.log('\n── Visca final state ──────────────────────────────────────────');
  console.log('  status         :', viscaFinal?.status);
  console.log('  currentOrderId :', viscaFinal?.currentOrderId ?? 'none');

  socket.disconnect();
  await mongoose.disconnect();
  console.log('\n✅ Done');
}

run().catch((err) => { console.error(err); process.exit(1); });
