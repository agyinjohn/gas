import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'firebase_options.dart';
import 'router.dart';
import 'services/background_location_service.dart';
import 'services/fcm_service.dart';

final navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const mapsKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
  if (mapsKey.isNotEmpty) AppConfig.setGoogleMapsApiKey(mapsKey);

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await FcmService.init(navKey: navigatorKey);
  await BackgroundLocationService.init();

  runApp(const ProviderScope(child: GetGasRiderApp()));
}
