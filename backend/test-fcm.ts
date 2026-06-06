import 'dotenv/config';
import mongoose from 'mongoose';
import admin from './src/config/firebase';
import { Rider } from './src/models/Rider';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('[DB] Connected');

  const rider = await Rider.findOne({ fcmToken: { $exists: true, $ne: '' } })
    .select('name fcmToken')
    .lean();

  if (!rider?.fcmToken) {
    console.error('❌ No rider with an FCM token found. Make sure the rider app is logged in and has registered its token.');
    process.exit(1);
  }

  console.log(`[FCM] Sending test push to rider: ${rider.name} (${rider.fcmToken!.slice(0, 30)}...)`);

  await admin.messaging().send({
    token: rider.fcmToken!,
    notification: {
      title: '🛵 Test Notification',
      body: 'FCM is working! You have a new delivery order.',
    },
    data: {
      type: 'new_order',
      orderId: 'test-123',
    },
    android: {
      priority: 'high',
      notification: { channelId: 'getgas_orders', sound: 'default' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  });

  console.log('✅ Push sent successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
