import 'package:getgas_core/getgas_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists location — same keys as web `localStorage`.
class LocationStorage {
  Future<({double? lat, double? lng, String? label, String? address, String? mode})> read() async {
    final prefs = await SharedPreferences.getInstance();
    final latStr = prefs.getString(StorageKeys.lat);
    final lngStr = prefs.getString(StorageKeys.lng);
    return (
      lat: latStr != null ? double.tryParse(latStr) : null,
      lng: lngStr != null ? double.tryParse(lngStr) : null,
      label: prefs.getString(StorageKeys.locationLabel),
      address: prefs.getString(StorageKeys.locationAddress),
      mode: prefs.getString(StorageKeys.locationMode),
    );
  }

  Future<void> write({
    required double lat,
    required double lng,
    required String label,
    required String address,
    required String mode,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(StorageKeys.lat, lat.toString());
    await prefs.setString(StorageKeys.lng, lng.toString());
    await prefs.setString(StorageKeys.locationLabel, label);
    await prefs.setString(StorageKeys.locationAddress, address);
    await prefs.setString(StorageKeys.locationMode, mode);
  }
}
