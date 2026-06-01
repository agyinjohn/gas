import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';

import '../data/location_storage.dart';

final locationStorageProvider = Provider<LocationStorage>((_) => LocationStorage());

class LocationState {
  const LocationState({
    this.coords,
    this.label = '',
    this.address = '',
    this.displayState = LocationDisplayState.detecting,
    this.loading = true,
  });

  final ({double lat, double lng})? coords;
  final String label;
  final String address;
  final LocationDisplayState displayState;
  final bool loading;

  bool get hasCoords => coords != null;

  LocationState copyWith({
    ({double lat, double lng})? coords,
    String? label,
    String? address,
    LocationDisplayState? displayState,
    bool? loading,
  }) {
    return LocationState(
      coords: coords ?? this.coords,
      label: label ?? this.label,
      address: address ?? this.address,
      displayState: displayState ?? this.displayState,
      loading: loading ?? this.loading,
    );
  }
}

class LocationNotifier extends StateNotifier<LocationState> {
  LocationNotifier(this._storage) : super(const LocationState()) {
    _bootstrap();
  }

  final LocationStorage _storage;

  Future<void> _bootstrap() async {
    final saved = await _storage.read();
    if (saved.lat != null && saved.lng != null) {
      state = LocationState(
        coords: (lat: saved.lat!, lng: saved.lng!),
        label: saved.label ?? 'Current location',
        address: saved.address ?? '',
        displayState: saved.mode == 'manual'
            ? LocationDisplayState.manual
            : LocationDisplayState.granted,
        loading: false,
      );
      if (saved.mode != 'manual') {
        silentRefresh();
      }
      return;
    }
    await requestLocation();
  }

  Future<void> silentRefresh() async {
    try {
      final pos = await _currentPosition();
      await _applyPosition(pos, mode: 'granted', silent: true);
    } catch (_) {
      /* keep saved */
    }
  }

  Future<bool> requestLocation() async {
    state = state.copyWith(displayState: LocationDisplayState.detecting, loading: true);
    try {
      final pos = await _currentPosition();
      await _applyPosition(pos, mode: 'granted');
      return true;
    } catch (_) {
      state = state.copyWith(
        displayState: LocationDisplayState.denied,
        loading: false,
      );
      return false;
    }
  }

  Future<void> applyPicked(PickedLocation loc, {String mode = 'manual'}) async {
    await _storage.write(
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
      address: loc.formatted,
      mode: mode,
    );
    state = LocationState(
      coords: (lat: loc.lat, lng: loc.lng),
      label: loc.label,
      address: loc.formatted,
      displayState: mode == 'manual'
          ? LocationDisplayState.manual
          : LocationDisplayState.granted,
      loading: false,
    );
  }

  Future<void> _applyPosition(
    Position pos, {
    required String mode,
    bool silent = false,
  }) async {
    final label = await _reverseGeocodeLabel(pos.latitude, pos.longitude);
    final placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
    final formatted = placemarks.isNotEmpty
        ? _formatPlacemark(placemarks.first)
        : label;

    await _storage.write(
      lat: pos.latitude,
      lng: pos.longitude,
      label: label,
      address: formatted,
      mode: mode,
    );

    state = LocationState(
      coords: (lat: pos.latitude, lng: pos.longitude),
      label: label,
      address: formatted,
      displayState: LocationDisplayState.granted,
      loading: false,
    );
  }

  Future<Position> _currentPosition() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) throw Exception('Location disabled');

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Permission denied');
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  }

  Future<String> _reverseGeocodeLabel(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isEmpty) return 'Current location';
      final p = placemarks.first;
      return p.subLocality?.isNotEmpty == true
          ? p.subLocality!
          : p.locality?.isNotEmpty == true
              ? p.locality!
              : 'Current location';
    } catch (_) {
      return 'Current location';
    }
  }

  String _formatPlacemark(Placemark p) {
    final parts = [
      if (p.street?.isNotEmpty == true) p.street,
      if (p.subLocality?.isNotEmpty == true) p.subLocality,
      if (p.locality?.isNotEmpty == true) p.locality,
    ].whereType<String>().toList();
    return parts.isEmpty ? 'Current location' : parts.join(', ');
  }
}

final locationProvider =
    StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier(ref.watch(locationStorageProvider));
});
