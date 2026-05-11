/**
 * Run: npx ts-node src/utils/seed.ts
 * Creates the first admin account, sample station data, riders, and orders.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/GetGas';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const { Admin } = await import('../models/Admin');
  const { User } = await import('../models/User');
  const { Station } = await import('../models/Station');
  const { Rider } = await import('../models/Rider');
  const { Order } = await import('../models/Order');

  // Create admin
  let existingAdmin = await Admin.findOne({ $or: [{ email: 'admin@GetGas.app' }, { phone: '+233000000000' }] });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@GetGas2025!', 12);
    await Admin.create({
      name: 'Super Admin',
      phone: '+233000000000',
      email: 'admin@GetGas.app',
      passwordHash,
      role: 'super_admin',
    });
    console.log('✅ Admin created: admin@GetGas.app / Admin@GetGas2025!');
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Create phone-based admin
  let phoneAdmin = await Admin.findOne({ phone: '+233100000001' });
  if (!phoneAdmin) {
    phoneAdmin = await Admin.create({
      name: 'Phone Admin',
      phone: '+233100000001',
      email: 'admin-phone@GetGas.app',
      passwordHash: 'Admin@123',
      role: 'super_admin',
      isActive: true,
    });
    console.log('✅ Phone admin created: +233100000001 / Admin@123');
  } else {
    console.log('ℹ️  Phone admin already exists');
  }

  let owner = await User.findOne({ phone: '+233200000001' });
  if (!owner) {
    owner = await User.create({
      name: 'Kwame Station Owner',
      phone: '+233200000001',
      isVerified: true,
      passwordHash: 'Station@123', // Let pre-save hook hash it
    });
    console.log('✅ Sample station owner created: +233200000001 / Station@123');
  } else if (!owner.passwordHash) {
    owner.passwordHash = 'Station@123'; // Let pre-save hook hash it
    await owner.save();
    console.log('✅ Password added to existing station owner');
  }

  // Create sample stations
  const stationData = [
    {
      name: 'Apex Gas',
      address: '12 Liberation Road, Accra',
      city: 'Accra',
      lat: 5.6037, lng: -0.1870,
      geohash: 's174mu8',
      ratingAvg: 4.8, totalOrders: 312,
      listings: [
        { size: 3,  fillPrice: 45,  exchangePrice: 35,  stock: 20 },
        { size: 6,  fillPrice: 85,  exchangePrice: 70,  stock: 15 },
        { size: 12, fillPrice: 160, exchangePrice: 140, stock: 8  },
      ],
    },
    {
      name: 'Osu Gas & Go',
      address: '47 Oxford Street, Osu, Accra',
      city: 'Accra',
      lat: 5.5558, lng: -0.1772,
      geohash: 's174k3p',
      ratingAvg: 4.5, totalOrders: 198,
      listings: [
        { size: 3,  fillPrice: 48,  exchangePrice: 38,  stock: 10 },
        { size: 6,  fillPrice: 88,  exchangePrice: 72,  stock: 12 },
        { size: 12, fillPrice: 165, exchangePrice: 145, stock: 5  },
      ],
    },
    {
      name: 'Tema LPG Express',
      address: 'Community 1, Tema',
      city: 'Tema',
      lat: 5.6698, lng: -0.0166,
      geohash: 's175h2q',
      ratingAvg: 4.6, totalOrders: 421,
      listings: [
        { size: 6,  fillPrice: 82,  exchangePrice: 68,  stock: 25 },
        { size: 12, fillPrice: 155, exchangePrice: 135, stock: 14 },
      ],
    },
    {
      name: 'Madina Gas Hub',
      address: 'Madina Market Road, Accra',
      city: 'Accra',
      lat: 5.6800, lng: -0.1650,
      geohash: 's174wy5',
      ratingAvg: 4.3, totalOrders: 156,
      listings: [
        { size: 3,  fillPrice: 44,  exchangePrice: 34,  stock: 18 },
        { size: 6,  fillPrice: 83,  exchangePrice: 69,  stock: 9  },
      ],
    },
    {
      name: 'Kaneshie Quick Gas',
      address: 'Kaneshie First Close, Accra',
      city: 'Accra',
      lat: 5.5700, lng: -0.2300,
      geohash: 's174d8m',
      ratingAvg: 4.7, totalOrders: 287,
      listings: [
        { size: 3,  fillPrice: 46,  exchangePrice: 36,  stock: 30 },
        { size: 6,  fillPrice: 86,  exchangePrice: 71,  stock: 20 },
        { size: 12, fillPrice: 162, exchangePrice: 142, stock: 10 },
      ],
    },
    {
      name: 'East Legon Gas Station',
      address: 'American House Junction, East Legon',
      city: 'Accra',
      lat: 5.6360, lng: -0.1530,
      geohash: 's174qe3',
      ratingAvg: 4.9, totalOrders: 534,
      listings: [
        { size: 6,  fillPrice: 90,  exchangePrice: 75,  stock: 22 },
        { size: 12, fillPrice: 170, exchangePrice: 150, stock: 11 },
      ],
    },
    {
      name: 'Lapaz LPG Depot',
      address: 'Lapaz Main Road, Accra',
      city: 'Accra',
      lat: 5.6150, lng: -0.2450,
      geohash: 's174b7k',
      ratingAvg: 4.2, totalOrders: 89,
      listings: [
        { size: 3,  fillPrice: 43,  exchangePrice: 33,  stock: 0  }, // out of stock
        { size: 6,  fillPrice: 81,  exchangePrice: 67,  stock: 7  },
      ],
    },
    {
      name: 'Spintex Gas Point',
      address: 'Spintex Road, Accra',
      city: 'Accra',
      lat: 5.6200, lng: -0.1200,
      geohash: 's174t9n',
      ratingAvg: 4.4, totalOrders: 203,
      listings: [
        { size: 3,  fillPrice: 47,  exchangePrice: 37,  stock: 14 },
        { size: 6,  fillPrice: 87,  exchangePrice: 73,  stock: 18 },
        { size: 12, fillPrice: 163, exchangePrice: 143, stock: 6  },
      ],
    },
    // ── Kumasi stations ──
    {
      name: 'Kumasi Central Gas',
      address: 'Adum, Kumasi',
      city: 'Kumasi',
      lat: 6.6885, lng: -1.6244,
      geohash: 's17098k',
      ratingAvg: 4.7, totalOrders: 389,
      listings: [
        { size: 3,  fillPrice: 44,  exchangePrice: 34,  stock: 25 },
        { size: 6,  fillPrice: 84,  exchangePrice: 69,  stock: 18 },
        { size: 12, fillPrice: 158, exchangePrice: 138, stock: 10 },
      ],
    },
    {
      name: 'Asokwa LPG Station',
      address: 'Asokwa Industrial Area, Kumasi',
      city: 'Kumasi',
      lat: 6.6700, lng: -1.6100,
      geohash: 's1709e2',
      ratingAvg: 4.5, totalOrders: 214,
      listings: [
        { size: 6,  fillPrice: 83,  exchangePrice: 68,  stock: 20 },
        { size: 12, fillPrice: 156, exchangePrice: 136, stock: 8  },
      ],
    },
    {
      name: 'Bantama Gas Express',
      address: 'Bantama High Street, Kumasi',
      city: 'Kumasi',
      lat: 6.7100, lng: -1.6350,
      geohash: 's1709s7',
      ratingAvg: 4.6, totalOrders: 176,
      listings: [
        { size: 3,  fillPrice: 45,  exchangePrice: 35,  stock: 16 },
        { size: 6,  fillPrice: 85,  exchangePrice: 70,  stock: 14 },
      ],
    },
    {
      name: 'Suame Gas & Cylinder',
      address: 'Suame Magazine Road, Kumasi',
      city: 'Kumasi',
      lat: 6.7200, lng: -1.6200,
      geohash: 's1709ub',
      ratingAvg: 4.3, totalOrders: 142,
      listings: [
        { size: 3,  fillPrice: 43,  exchangePrice: 33,  stock: 30 },
        { size: 6,  fillPrice: 82,  exchangePrice: 67,  stock: 22 },
        { size: 12, fillPrice: 154, exchangePrice: 134, stock: 12 },
      ],
    },
    {
      name: 'Nhyiaeso Quick Gas',
      address: 'Nhyiaeso, Kumasi',
      city: 'Kumasi',
      lat: 6.6950, lng: -1.5980,
      geohash: 's1709h5',
      ratingAvg: 4.8, totalOrders: 298,
      listings: [
        { size: 6,  fillPrice: 86,  exchangePrice: 71,  stock: 17 },
        { size: 12, fillPrice: 160, exchangePrice: 140, stock: 9  },
      ],
    },
  ];

  let created = 0;
  const stationMap: { [key: string]: any } = {};
  for (const s of stationData) {
    let station = await Station.findOne({ name: s.name });
    if (!station) {
      station = await Station.create({
        ownerId: owner._id,
        name: s.name,
        address: s.address,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        geohash: s.geohash,
        status: 'active',
        commissionPct: 10,
        ratingAvg: s.ratingAvg,
        totalOrders: s.totalOrders,
        cylinderListings: s.listings.map((l) => ({
          size: l.size,
          brand: 'Gogas',
          fillType: 'LPG',
          fillPrice: l.fillPrice,
          exchangePrice: l.exchangePrice,
          stockCount: l.stock,
          lowStockThreshold: 5,
          isAvailable: l.stock > 0,
        })),
      });
      created++;
    }
    stationMap[s.name] = station;
  }
  console.log(`✅ ${created} station(s) created (${stationData.length - created} already existed)`);

  // Create sample riders
  const riderData = [
    { name: 'Kofi Mensah', phone: '+233501234567', vehicleType: 'motorbike', vehiclePlate: 'GE-1234-21' },
    { name: 'Ama Boateng', phone: '+233502345678', vehicleType: 'tricycle', vehiclePlate: 'GE-5678-21' },
    { name: 'Yaw Asante', phone: '+233503456789', vehicleType: 'van', vehiclePlate: 'GE-9012-21' },
    { name: 'Abena Owusu', phone: '+233504567890', vehicleType: 'motorbike', vehiclePlate: 'GE-3456-21' },
    { name: 'Kwesi Appiah', phone: '+233505678901', vehicleType: 'tricycle', vehiclePlate: 'GE-7890-21' },
  ];

  const riderMap: { [key: string]: any } = {};
  for (const r of riderData) {
    let rider = await Rider.findOne({ phone: r.phone });
    if (!rider) {
      rider = await Rider.create({
        name: r.name,
        phone: r.phone,
        passwordHash: 'Rider@123',
        nationalId: 'GHA-' + Math.random().toString(36).substring(7).toUpperCase(),
        vehicleType: r.vehicleType,
        vehiclePlate: r.vehiclePlate,
        kycStatus: 'approved',
        status: 'available',
        location: { lat: 5.6037, lng: -0.1870, updatedAt: new Date() },
        totalTrips: Math.floor(Math.random() * 100) + 10,
        ratingAvg: Math.random() * 1.5 + 3.5,
        totalRatings: Math.floor(Math.random() * 50) + 5,
        totalEarnings: Math.random() * 5000 + 500,
        isActive: true,
      });
    }
    riderMap[r.phone] = rider;
  }
  console.log(`✅ ${Object.keys(riderMap).length} rider(s) created/found`);

  // Create sample users
  const userData = [
    { name: 'John Doe', phone: '+233501111111' },
    { name: 'Jane Smith', phone: '+233502222222' },
    { name: 'Michael Brown', phone: '+233503333333' },
    { name: 'Sarah Johnson', phone: '+233504444444' },
    { name: 'David Wilson', phone: '+233505555555' },
  ];

  const userMap: { [key: string]: any } = {};
  for (const u of userData) {
    let user = await User.findOne({ phone: u.phone });
    if (!user) {
      user = await User.create({
        name: u.name,
        phone: u.phone,
        isVerified: true,
        passwordHash: 'User@123',
      });
    }
    userMap[u.phone] = user;
  }
  console.log(`✅ ${Object.keys(userMap).length} user(s) created/found`);

  // Create sample orders for Apex Gas station
  const apexGasStation = stationMap['Apex Gas'];
  const orderStatuses = ['pending', 'accepted', 'at_station', 'en_route', 'delivered', 'cancelled'];
  const orderTypes = ['fill', 'delivery', 'exchange'];
  const paymentMethods = ['mobile_money', 'card', 'cash'];

  let ordersCreated = 0;
  const riderPhones = Object.keys(riderMap);
  const userPhones = Object.keys(userMap);

  for (let i = 0; i < 15; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const orderType = orderTypes[i % orderTypes.length];
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const userId = userMap[userPhones[i % userPhones.length]]._id;
    const riderId = status !== 'pending' && status !== 'cancelled' ? riderMap[riderPhones[i % riderPhones.length]]._id : undefined;

    const cylinders = [
      { size: 6, quantity: 1, unitPrice: 85, subtotal: 85 },
    ];
    const cylinderSubtotal = 85;
    const deliveryFee = 5;
    const totalAmount = cylinderSubtotal + deliveryFee;
    const commissionPct = 10;
    const commissionAmount = totalAmount * (commissionPct / 100);
    const stationPayout = totalAmount - commissionAmount;

    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - (i * 2)); // Spread orders over time

    const order = await Order.create({
      userId,
      stationId: apexGasStation._id,
      riderId,
      cylinders,
      orderType,
      cylinderSubtotal,
      deliveryFee,
      totalAmount,
      commissionPct,
      commissionAmount,
      stationPayout,
      surgeMultiplier: 1,
      loyaltyPointsEarned: Math.floor(totalAmount / 10),
      loyaltyPointsRedeemed: 0,
      loyaltyDiscount: 0,
      status,
      statusHistory: [
        {
          status: 'pending',
          triggeredBy: 'user',
          timestamp: createdAt,
        },
        ...(status !== 'pending' ? [{
          status,
          triggeredBy: status === 'cancelled' ? 'user' : 'station',
          timestamp: new Date(createdAt.getTime() + 10 * 60000),
        }] : []),
      ],
      deliveryAddress: {
        street: `${100 + i} Main Street`,
        city: 'Accra',
        lat: 5.6037 + (Math.random() - 0.5) * 0.05,
        lng: -0.1870 + (Math.random() - 0.5) * 0.05,
      },
      otpCode: String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
      otpExpiresAt: new Date(Date.now() + 10 * 60000),
      otpAttempts: 0,
      otpVerifiedAt: status !== 'pending' ? new Date(createdAt.getTime() + 5 * 60000) : undefined,
      paymentMethod,
      paymentStatus: status === 'delivered' ? 'captured' : 'pending',
      isScheduled: false,
      notes: i % 3 === 0 ? 'Please ring the bell twice' : undefined,
      createdAt,
      updatedAt: createdAt,
    });

    ordersCreated++;
  }

  console.log(`✅ ${ordersCreated} sample orders created for "Apex Gas"`);

  console.log('\n📝 To add new cylinder sizes to a station:');
  console.log('   PATCH /api/v1/stations/{stationId}/prices');
  console.log('   Body: { "size": 5, "fillPrice": 60, "exchangePrice": 50 }');
  console.log('   Supported sizes: 3, 4, 5, 6, 9, 11, 12, 14, 15, 18, 19, 20, 30, 47, 48');
  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
