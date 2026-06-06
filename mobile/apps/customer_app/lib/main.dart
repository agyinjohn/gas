import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'bootstrap/env_loader.dart';
import 'bootstrap/maps_init.dart';
import 'firebase_options.dart';
import 'router.dart';
import 'services/fcm_service.dart';

final navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadBundledEnv();
  await initGoogleMaps();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await FcmService.init(navKey: navigatorKey);
  runApp(const ProviderScope(child: GetGasCustomerApp()));
}
