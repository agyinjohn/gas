/**
 * diagnose-dispatch.ts
 * Run: npx ts-node diagnose-dispatch.ts
 *
 * Checks the latest pending order and diagnoses exactly why
 * each rider in the DB did or did not qualify for dispatch.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI!;
const DISPATCH_RADIUS_KM = parseInt(process.env.DEFAULT_DISPATCH_RADIUS_KM || '5');

const OrderSchema  = new mongoose.Schema({}, { strict: false });
const RiderSchema  = new mongoose.Schema({}, { strict: false });
const StationSchema = new mongoose.Schema({}, { strict: false });

const Order   = mongoose.models.Order   || mongoose.model('Order',   OrderSchema);
const Rider   = mongoose.models.Rider   || mongoose.model('Rider',   RiderSchema);
const Station = mongoose.models.Station || mongoose.model('Station', StationSchema);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // ── Latest non-delivered, non-cancelled order ─────────────────────────────
  const order = await Order.findOne({
    status: { $in: ['pending', 'accepted', 'at_station', 'en_route'] },
  }).sort({ createdAt: -1 }).lean() as any;

  if (!order) {
    console.log('No active orders found.');
    await mongoose.disconnect();
    return;
  }

  console.log('── Latest active order ────────────────────────────────────────');
  console.log('  _id            :', order._id);
  console.log('  status         :', order.status);
  console.log('  stationId      :', order.stationId);
  console.log('  riderId        :', order.riderId ?? 'unassigned');
  console.log('  createdAt      :', order.createdAt);
  console.log('  dispatchAttempts:', order.dispatchAttempts?.length ?? 0);
  if (order.dispatchAttempts?.length) {
    for (const a of order.dispatchAttempts) {
      console.log(`    rider=${a.riderId}  outcome=${a.outcome}  sentAt=${a.sentAt}`);
    }
  }

  // ── Station coords ────────────────────────────────────────────────────────
  const station = await Station.findById(order.stationId).lean() as any;
  if (!station) {
    console.log('\n❌ Station not found for this order!');
    await mongoose.disconnect();
    return;
  }

  console.log('\n── Station ────────────────────────────────────────────────────');
  console.log('  name   :', station.name);
  console.log('  status :', station.status);
  console.log('  lat    :', station.lat);
  console.log('  lng    :', station.lng);

  const sLat = station.lat;
  const sLng = station.lng;

  // ── All riders in DB ──────────────────────────────────────────────────────
  const allRiders = await Rider.find({}).lean() as any[];
  console.log(`\n── All riders in DB (${allRiders.length}) ─────────────────────────────────`);

  const attemptedIds = new Set((order.dispatchAttempts ?? []).map((a: any) => a.riderId.toString()));

  for (const r of allRiders) {
    const issues: string[] = [];

    if (r.status !== 'available')   issues.push(`status=${r.status} (need: available)`);
    if (r.kycStatus !== 'approved') issues.push(`kycStatus=${r.kycStatus} (need: approved)`);
    if (!r.location?.lat || !r.location?.lng) {
      issues.push('no location recorded');
    } else {
      const dist = haversineKm(sLat, sLng, r.location.lat, r.location.lng);
      const distStr = dist.toFixed(2) + ' km';
      if (dist > DISPATCH_RADIUS_KM) issues.push(`too far: ${distStr} (radius: ${DISPATCH_RADIUS_KM} km)`);
      else issues.push(`✅ within radius: ${distStr}`);

      const locAge = r.location.updatedAt
        ? Math.round((Date.now() - new Date(r.location.updatedAt).getTime()) / 1000)
        : null;
      if (locAge !== null && locAge > 120) issues.push(`location stale: ${locAge}s ago`);
    }

    if (attemptedIds.has(r._id.toString())) issues.push('already attempted this order');

    const pass = issues.every((i) => i.startsWith('✅'));
    const icon = pass ? '✅' : '❌';
    console.log(`\n  ${icon} ${r.name} (${r._id})`);
    for (const issue of issues) {
      console.log(`     • ${issue}`);
    }
  }

  console.log(`\n── Dispatch config ────────────────────────────────────────────`);
  console.log('  DISPATCH_RADIUS_KM    :', DISPATCH_RADIUS_KM);
  console.log('  MAX_DISPATCH_ATTEMPTS :', process.env.MAX_DISPATCH_ATTEMPTS ?? 3);
  console.log('  ACCEPT_TIMEOUT_SECONDS:', process.env.ORDER_ACCEPT_TIMEOUT_SECONDS ?? 60);

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

run().catch((err) => { console.error(err); process.exit(1); });
