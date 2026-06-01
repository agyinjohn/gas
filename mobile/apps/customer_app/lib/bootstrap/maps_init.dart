import 'dart:io';

import 'package:google_maps_flutter_android/google_maps_flutter_android.dart';
import 'package:google_maps_flutter_platform_interface/google_maps_flutter_platform_interface.dart';

/// Ensures the Google Maps Android platform view is registered before any map widget builds.
Future<void> initGoogleMaps() async {
  if (!Platform.isAndroid) return;
  final impl = GoogleMapsFlutterPlatform.instance;
  if (impl is GoogleMapsFlutterAndroid) {
    impl.useAndroidViewSurface = true;
  }
}
