import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:getgas_core/getgas_core.dart';

/// Loads API URL, socket URL and Maps key from bundled env asset.
Future<void> loadBundledEnv() async {
  try {
    final raw = await rootBundle.loadString('assets/env/mobile.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;

    final apiUrl = data['API_URL'] as String? ?? '';
    if (apiUrl.isNotEmpty) AppConfig.setApiUrl(apiUrl);

    final key = data['GOOGLE_MAPS_API_KEY'] as String? ?? '';
    if (key.isNotEmpty) AppConfig.setGoogleMapsApiKey(key);
  } on Object {
    // Asset missing — falls back to --dart-define or defaultApiUrl.
  }
}
