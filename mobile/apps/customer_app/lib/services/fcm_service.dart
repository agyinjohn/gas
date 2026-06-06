import 'dart:typed_data';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await FcmService.showLocalNotification(message);
}

class FcmService {
  FcmService._();

  static final _fln = FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? navigatorKey;

  static final _channel = AndroidNotificationChannel(
    'getgas_customer_v1',
    'Order Updates',
    description: 'Order status notifications',
    importance: Importance.max,
    playSound: true,
    vibrationPattern: Int64List.fromList([0, 400, 200, 400]),
    enableVibration: true,
  );

  static Future<void> init({GlobalKey<NavigatorState>? navKey}) async {
    navigatorKey = navKey;

    FirebaseMessaging.onBackgroundMessage(_bgHandler);

    await _fln
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    await _fln.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: _onTap,
    );

    await FirebaseMessaging.instance.requestPermission(
      alert: true, badge: true, sound: true,
    );

    FirebaseMessaging.onMessage.listen(showLocalNotification);
    FirebaseMessaging.onMessageOpenedApp.listen(_navigateFromMessage);

    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _navigateFromMessage(initial);
  }

  static Future<void> showLocalNotification(RemoteMessage message) async {
    final n = message.notification;
    final orderId = message.data['orderId'];
    final title = n?.title ?? 'GetGas';
    final body  = n?.body  ?? '';

    await _fln.show(
      orderId != null ? orderId.hashCode : title.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id, _channel.name,
          channelDescription: _channel.description,
          importance: Importance.max,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          vibrationPattern: Int64List.fromList([0, 400, 200, 400]),
          enableVibration: true,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true, presentBadge: true, presentSound: true,
        ),
      ),
      payload: orderId,
    );
  }

  static void _onTap(NotificationResponse response) {
    final orderId = response.payload;
    if (orderId != null && orderId.isNotEmpty) {
      navigatorKey?.currentState?.pushNamed('/orders/$orderId');
    }
  }

  static void _navigateFromMessage(RemoteMessage message) {
    final orderId = message.data['orderId'];
    if (orderId != null && (orderId as String).isNotEmpty) {
      navigatorKey?.currentState?.pushNamed('/orders/$orderId');
    }
  }

  static Future<String?> getToken() => FirebaseMessaging.instance.getToken();
  static Stream<String> get onTokenRefresh => FirebaseMessaging.instance.onTokenRefresh;
}
