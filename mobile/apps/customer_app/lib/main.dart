import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'bootstrap/env_loader.dart';
import 'bootstrap/maps_init.dart';
import 'router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadBundledEnv();
  await initGoogleMaps();
  runApp(const ProviderScope(child: GetGasCustomerApp()));
}
