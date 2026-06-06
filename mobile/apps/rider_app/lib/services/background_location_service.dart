import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

// Keys used to pass config into the background isolate via SharedPreferences
const _kToken = 'bg_loc_token';
const _kRiderId = 'bg_loc_rider_id';
const _kSocketUrl = 'bg_loc_socket_url';

// ─── Top-level entry point (runs in its own isolate) ──────────────────────────

@pragma('vm:entry-point')
Future<void> _onServiceStart(ServiceInstance service) async {
  if (service is AndroidServiceInstance) {
    service
        .on('setAsForeground')
        .listen((_) => service.setAsForegroundService());
    service
        .on('setAsBackground')
        .listen((_) => service.setAsBackgroundService());
    await service.setAsForegroundService();
    service.setForegroundNotificationInfo(
      title: 'GetGas Rider',
      content: 'Sharing your location with customers',
    );
  }

  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString(_kToken);
  final riderId = prefs.getString(_kRiderId);
  final socketUrl = prefs.getString(_kSocketUrl);

  void log(String msg) => service.invoke('log', {'msg': msg});

  log(
    'isolate started | token=${token != null} riderId=$riderId socketUrl=$socketUrl',
  );

  if (token == null || riderId == null || socketUrl == null) {
    log('missing config — stopping');
    service.stopSelf();
    return;
  }

  final socket = io.io(
    socketUrl,
    io.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .enableReconnection()
        .setReconnectionAttempts(20)
        .setReconnectionDelay(2000)
        .build(),
  );

  socket.onConnect((_) {
    socket.emit('join:rider', riderId);
  });

  socket.onConnectError(
    (err) => service.invoke('log', {'msg': 'socket connect error: $err'}),
  );

  // Keepalive — ping every 30s so Android doesn't kill the service,
  // but don't update the notification text.
  Timer.periodic(const Duration(seconds: 30), (_) {
    service.invoke('keepalive');
  });

  StreamSubscription? sub;

  void listen() {
    sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen(
      (pos) {
        service.invoke('location', {'lat': pos.latitude, 'lng': pos.longitude});
        if (socket.connected) {
          socket.emit('rider:location', {
            'riderId': riderId,
            'lat': pos.latitude,
            'lng': pos.longitude,
            'source': 'background',
          });
        }
      },
      onError: (e) {
        log('location stream error: $e — restarting');
        sub?.cancel();
        Future.delayed(const Duration(seconds: 3), listen);
      },
      cancelOnError: true,
    );
  }

  listen();

  service.on('stop').listen((_) {
    sub?.cancel();
    socket.dispose();
    service.stopSelf();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

class BackgroundLocationService {
  BackgroundLocationService._();

  static final _svc = FlutterBackgroundService();

  static Future<void> init() async {
    const channel = AndroidNotificationChannel(
      'getgas_location',
      'Location Tracking',
      description: 'Active while you are online and accepting orders',
      importance: Importance.high,
    );
    await FlutterLocalNotificationsPlugin()
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);

    await _svc.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onServiceStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'getgas_location',
        initialNotificationTitle: 'GetGas Rider',
        initialNotificationContent: 'Sharing your location',
        foregroundServiceNotificationId: 888,
        foregroundServiceTypes: [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onServiceStart,
      ),
    );
  }

  /// Call this right after login / on app start so the isolate can read the config.
  static Future<void> saveForBackground({
    required String token,
    required String riderId,
    required String socketUrl,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
    await prefs.setString(_kRiderId, riderId);
    await prefs.setString(_kSocketUrl, socketUrl);
  }

  static Future<bool> requestPermissions() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      return false;
    }
    if (perm == LocationPermission.whileInUse) {
      perm = await Geolocator.requestPermission();
    }
    return perm == LocationPermission.always ||
        perm == LocationPermission.whileInUse;
  }

  static Future<void> start() async {
    final granted = await requestPermissions();
    if (!granted) return;
    try {
      // Ask Android to ignore battery optimizations so the service
      // isn't killed on budget devices
      if (Platform.isAndroid) {
        const channel = MethodChannel('getgas/battery');
        try {
          await channel.invokeMethod('requestIgnoreBatteryOptimizations');
        } catch (_) {}
      }
      final running = await _svc.isRunning();
      if (!running) await _svc.startService();
    } catch (_) {}
  }

  static Future<void> stop() async {
    try {
      final running = await _svc.isRunning();
      if (running) _svc.invoke('stop');
    } catch (_) {}
  }

  /// Stream of {lat, lng} maps relayed from the background isolate.
  static Stream<Map<String, dynamic>?> get locationStream =>
      _svc.on('location');
}
