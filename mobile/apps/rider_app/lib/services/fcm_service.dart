import 'dart:typed_data';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// Top-level so the background isolate can reach it
@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await FcmService.showLocalNotification(message);
}

class FcmService {
  FcmService._();

  static final _fln = FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? navigatorKey;

  static final _channel = AndroidNotificationChannel(
    'getgas_orders_v3',
    'New Orders',
    description: 'Incoming delivery order alerts',
    importance: Importance.max,
    playSound: true,
    sound: RawResourceAndroidNotificationSound('order_alert'),
    vibrationPattern: Int64List.fromList([0, 400, 200, 400, 200, 400, 200, 400, 200, 400, 200, 400]),
    enableVibration: true,
  );

  static Future<void> init({GlobalKey<NavigatorState>? navKey}) async {
    navigatorKey = navKey;

    FirebaseMessaging.onBackgroundMessage(_bgHandler);

    // Create Android channel
    await _fln
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // Init flutter_local_notifications with tap callback
    await _fln.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: _onTap,
    );

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Foreground: show heads-up notification
    FirebaseMessaging.onMessage.listen(showLocalNotification);

    // Background tap (notification tray) — app was in background
    FirebaseMessaging.onMessageOpenedApp.listen(_navigateFromMessage);

    // Terminated tap — app was killed, launched by tapping notification
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _navigateFromMessage(initial);
  }

  static Future<void> showLocalNotification(RemoteMessage message) async {
    final n = message.notification;
    final orderId = message.data['orderId'];
    final title = n?.title ?? 'New Order';
    final body  = n?.body  ?? 'You have a new delivery request';

    await _fln.show(
      // stable ID per order so duplicate pushes don't stack
      orderId != null ? orderId.hashCode : title.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          ticker: title,
          sound: const RawResourceAndroidNotificationSound('order_alert'),
          playSound: true,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 400, 200, 400, 200, 400, 200, 400, 200, 400, 200, 400]),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      // Pass orderId as payload so _onTap can navigate
      payload: orderId,
    );
  }

  // Called when user taps a local notification
  static void _onTap(NotificationResponse response) {
    final orderId = response.payload;
    if (orderId != null && orderId.isNotEmpty) {
      navigatorKey?.currentState?.pushNamed('/orders/$orderId');
    }
  }

  // Called when user taps an FCM notification (background / terminated)
  static void _navigateFromMessage(RemoteMessage message) {
    final orderId = message.data['orderId'];
    if (orderId != null && (orderId as String).isNotEmpty) {
      navigatorKey?.currentState?.pushNamed('/orders/$orderId');
    }
  }

  static Future<String?> getToken() =>
      FirebaseMessaging.instance.getToken();

  static Stream<String> get onTokenRefresh =>
      FirebaseMessaging.instance.onTokenRefresh;
}
