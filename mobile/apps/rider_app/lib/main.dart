import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'firebase_options.dart';
import 'router.dart';
import 'services/background_location_service.dart';
import 'services/fcm_service.dart';

final navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    final raw = await rootBundle.loadString('config/production.json');
    final config = jsonDecode(raw) as Map<String, dynamic>;
    AppConfig.setApiUrl(config['API_URL'] as String? ?? '');
    AppConfig.setGoogleMapsApiKey(config['GOOGLE_MAPS_API_KEY'] as String? ?? '');
  } catch (_) {}

  const mapsKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
  if (mapsKey.isNotEmpty) AppConfig.setGoogleMapsApiKey(mapsKey);

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await FcmService.init(navKey: navigatorKey);
  await BackgroundLocationService.init();

  runApp(const ProviderScope(child: GetGasRiderApp()));
}
