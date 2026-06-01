import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:getgas_core/getgas_core.dart';

/// Loads Maps key from bundled env (synced from web `frontend/.env.local`).
Future<void> loadBundledEnv() async {
  try {
    final raw = await rootBundle.loadString('assets/env/mobile.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;
    final key = data['GOOGLE_MAPS_API_KEY'] as String? ?? '';
    if (key.isNotEmpty) {
      AppConfig.setGoogleMapsApiKey(key);
    }
  } on Object {
    // Asset missing until `dart run tool/sync_env.dart` is run once.
  }
}
