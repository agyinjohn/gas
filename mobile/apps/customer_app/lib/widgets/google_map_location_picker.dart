import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../services/places_service.dart';
import 'google_maps_config.dart';

/// Interactive Google Map with Places search — mirrors web `LocationPicker`.
class GoogleMapLocationPicker extends ConsumerStatefulWidget {
  const GoogleMapLocationPicker({
    super.key,
    this.initial,
    this.pickupLocationLabel,
    this.onLocationChanged,
    this.onConfirm,
    this.darkStyle = false,
  });

  final LatLng? initial;
  final String? pickupLocationLabel;
  final ValueChanged<PickedLocation>? onLocationChanged;
  final ValueChanged<PickedLocation>? onConfirm;
  final bool darkStyle;

  @override
  ConsumerState<GoogleMapLocationPicker> createState() => _GoogleMapLocationPickerState();
}

class _GoogleMapLocationPickerState extends ConsumerState<GoogleMapLocationPicker> {
  GoogleMapController? _mapController;
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();

  bool _mapReady = false;
  bool _mapError = false;
  bool _locating = false;
  bool _searching = false;
  bool _sameAsPickup = false;
  PickedLocation? _picked;
  List<PlaceSuggestion> _suggestions = [];
  Timer? _loadTimer;

  LatLng get _center => LatLng(
        _picked?.lat ?? widget.initial?.latitude ?? accraLat,
        _picked?.lng ?? widget.initial?.longitude ?? accraLng,
      );

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      if (mounted) setState(() {});
    });
    _startLoadTimeout();
  }

  void _startLoadTimeout() {
    _loadTimer?.cancel();
    _loadTimer = Timer(const Duration(seconds: 12), () {
      if (mounted && !_mapReady && !_mapError) {
        setState(() => _mapError = true);
      }
    });
  }

  @override
  void dispose() {
    _loadTimer?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _placeMarker(LatLng point) async {
    final places = ref.read(placesServiceProvider);
    PlaceLocation? loc;
    if (places != null) {
      loc = await places.reverseGeocode(point.latitude, point.longitude);
    }
    if (!mounted) return;
    setState(() {
      _picked = loc?.toPickedLocation() ??
          PickedLocation(
            lat: point.latitude,
            lng: point.longitude,
            street: 'Selected location',
            city: 'Ghana',
            formatted: '${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)}',
          );
      _sameAsPickup = false;
      _suggestions = [];
    });
    widget.onLocationChanged?.call(_picked!);
    _mapController?.animateCamera(CameraUpdate.newLatLngZoom(point, 17));
  }

  Future<void> _onSearchChanged(String value) async {
    final places = ref.read(placesServiceProvider);
    if (places == null || value.trim().length < 2) {
      setState(() => _suggestions = []);
      return;
    }
    setState(() => _searching = true);
    try {
      final results = await places.autocomplete(value);
      if (mounted) setState(() => _suggestions = results);
    } catch (_) {
      if (mounted) setState(() => _suggestions = []);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  Future<void> _selectSuggestion(PlaceSuggestion suggestion) async {
    _searchFocus.unfocus();
    _searchController.text = suggestion.description;
    setState(() => _suggestions = []);
    final places = ref.read(placesServiceProvider);
    if (places == null) return;
    final loc = await places.getPlaceDetails(suggestion.placeId);
    if (loc == null || !mounted) return;
    await _placeMarker(LatLng(loc.lat, loc.lng));
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw Exception('denied');
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );
      await _placeMarker(LatLng(pos.latitude, pos.longitude));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not get your location')),
        );
      }
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    _loadTimer?.cancel();
    if (!mounted) return;
    setState(() => _mapReady = true);
    if (widget.initial != null) {
      _placeMarker(widget.initial!);
    }
  }

  Set<Marker> get _markers {
    if (_picked == null) return {};
    return {
      Marker(
        markerId: const MarkerId('picked'),
        position: LatLng(_picked!.lat, _picked!.lng),
        draggable: true,
        onDragEnd: _placeMarker,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasGoogleMapsKey) {
      return _MapsKeyMissing(onClose: () => Navigator.of(context).maybePop());
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                focusNode: _searchFocus,
                enabled: !_mapError,
                onChanged: _onSearchChanged,
                decoration: InputDecoration(
                  hintText: 'Search for your address…',
                  prefixIcon: const Icon(Icons.search, size: 20, color: GetGasColors.textMuted),
                  suffixIcon: _searching
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : (_searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _suggestions = []);
                              },
                            )
                          : null),
                  filled: true,
                  fillColor: GetGasColors.bgCard2,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: GetGasColors.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: GetGasColors.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: GetGasColors.brand, width: 2)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                ),
              ),
              if (_suggestions.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  decoration: BoxDecoration(
                    color: GetGasColors.bgCard,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: GetGasColors.border),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 4))],
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _suggestions.length.clamp(0, 5),
                    separatorBuilder: (_, __) => const Divider(height: 1, color: GetGasColors.border),
                    itemBuilder: (context, i) {
                      final s = _suggestions[i];
                      return ListTile(
                        dense: true,
                        leading: const Icon(Icons.location_on_outlined, size: 18, color: GetGasColors.brand),
                        title: Text(s.description, style: const TextStyle(fontSize: 13)),
                        onTap: () => _selectSuggestion(s),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (!_mapError)
                GoogleMap(
                  initialCameraPosition: CameraPosition(target: _center, zoom: widget.initial != null ? 16 : 12),
                  markers: _markers,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: true,
                  mapToolbarEnabled: false,
                  style: widget.darkStyle ? googleMapDarkStyle : null,
                  onMapCreated: _onMapCreated,
                  onTap: _placeMarker,
                ),
              if (!_mapReady && !_mapError)
                ColoredBox(
                  color: GetGasColors.bgCard2,
                  child: const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: GetGasColors.brand),
                        SizedBox(height: 12),
                        Text('Loading map…', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
                      ],
                    ),
                  ),
                ),
              if (_mapError)
                _MapLoadError(
                  onRetry: () {
                    setState(() {
                      _mapError = false;
                      _mapReady = false;
                    });
                    _startLoadTimeout();
                  },
                ),
              if (!_mapError)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Material(
                    color: GetGasColors.bgCard,
                    borderRadius: BorderRadius.circular(12),
                    elevation: 3,
                    child: InkWell(
                      onTap: _locating || !_mapReady ? null : _useMyLocation,
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: _locating
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.my_location, color: GetGasColors.brand, size: 20),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (widget.pickupLocationLabel != null)
          _BottomConfirmBar(
            pickupLabel: widget.pickupLocationLabel,
            picked: _picked,
            sameAsPickup: _sameAsPickup,
            onSameAsPickupChanged: (v) => setState(() => _sameAsPickup = v),
            onConfirm: () {
              if (_sameAsPickup && widget.pickupLocationLabel != null) {
                final init = widget.initial;
                final loc = PickedLocation(
                  lat: init?.latitude ?? 0,
                  lng: init?.longitude ?? 0,
                  street: widget.pickupLocationLabel!,
                  city: '',
                  formatted: widget.pickupLocationLabel!,
                );
                widget.onConfirm?.call(loc);
              } else if (_picked != null) {
                widget.onConfirm?.call(_picked!);
              }
            },
            canConfirm: _sameAsPickup || _picked != null,
          ),
      ],
    );
  }
}

class _BottomConfirmBar extends StatelessWidget {
  const _BottomConfirmBar({
    this.pickupLabel,
    required this.picked,
    required this.sameAsPickup,
    required this.onSameAsPickupChanged,
    required this.onConfirm,
    required this.canConfirm,
  });

  final String? pickupLabel;
  final PickedLocation? picked;
  final bool sameAsPickup;
  final ValueChanged<bool> onSameAsPickupChanged;
  final VoidCallback onConfirm;
  final bool canConfirm;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: GetGasColors.bgCard,
        border: Border(top: BorderSide(color: GetGasColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (pickupLabel != null) ...[
            const Text('Pickup Location', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
            const SizedBox(height: 4),
            _locationRow(pickupLabel!, muted: true),
            const SizedBox(height: 12),
          ],
          const Text('Delivery Location', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
          const SizedBox(height: 4),
          _locationRow(
            sameAsPickup
                ? (pickupLabel ?? 'Same as pickup')
                : (picked?.formatted ?? 'Tap map to set location'),
          ),
          if (pickupLabel != null) ...[
            const SizedBox(height: 8),
            CheckboxListTile(
              value: sameAsPickup,
              onChanged: (v) => onSameAsPickupChanged(v ?? false),
              title: const Text('Same as pickup location', style: TextStyle(fontSize: 14)),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              activeColor: GetGasColors.brand,
            ),
          ],
          const SizedBox(height: 8),
          PrimaryButton(label: 'Continue', showArrow: true, onPressed: canConfirm ? onConfirm : null),
        ],
      ),
    );
  }

  Widget _locationRow(String text, {bool muted = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Icon(Icons.location_on, size: 16, color: muted ? GetGasColors.textMuted : GetGasColors.brand),
          const SizedBox(width: 8),
          Expanded(child: Text(text, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 14, color: muted ? GetGasColors.textMuted : GetGasColors.text))),
        ],
      ),
    );
  }
}

class _MapsKeyMissing extends StatelessWidget {
  const _MapsKeyMissing({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.map_outlined, size: 48, color: GetGasColors.error.withValues(alpha: 0.8)),
            const SizedBox(height: 16),
            const Text('Google Maps key required', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            const Text(
              'Google Maps key missing. Run: dart run tool/sync_env.dart (reads frontend/.env.local).',
              textAlign: TextAlign.center,
              style: TextStyle(color: GetGasColors.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 20),
            PrimaryButton(label: 'Go Back', onPressed: onClose),
          ],
        ),
      ),
    );
  }
}

class _MapLoadError extends StatelessWidget {
  const _MapLoadError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: GetGasColors.bgCard2,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_off, size: 48, color: GetGasColors.error.withValues(alpha: 0.8)),
              const SizedBox(height: 12),
              const Text('Map failed to load', style: TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text(
                'Stop the app and run flutter run again (full rebuild). Hot reload cannot load native maps.',
                textAlign: TextAlign.center,
                style: TextStyle(color: GetGasColors.textMuted, fontSize: 13),
              ),
              const SizedBox(height: 16),
              PrimaryButton(label: 'Retry', onPressed: onRetry),
            ],
          ),
        ),
      ),
    );
  }
}

/// Read-only Google Map for live tracking.
class GoogleTrackMapView extends StatefulWidget {
  const GoogleTrackMapView({
    super.key,
    this.riderLat,
    this.riderLng,
    this.deliveryLat,
    this.deliveryLng,
  });

  final double? riderLat;
  final double? riderLng;
  final double? deliveryLat;
  final double? deliveryLng;

  @override
  State<GoogleTrackMapView> createState() => _GoogleTrackMapViewState();
}

class _GoogleTrackMapViewState extends State<GoogleTrackMapView> {
  GoogleMapController? _controller;
  bool _mapReady = false;
  bool _mapError = false;
  Timer? _loadTimer;

  @override
  void initState() {
    super.initState();
    _loadTimer = Timer(const Duration(seconds: 12), () {
      if (mounted && !_mapReady && !_mapError) {
        setState(() => _mapError = true);
      }
    });
  }

  @override
  void dispose() {
    _loadTimer?.cancel();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant GoogleTrackMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    _fitBounds();
  }

  LatLng? get _delivery {
    final lat = widget.deliveryLat;
    final lng = widget.deliveryLng;
    if (lat == null || lng == null || lat == 0 || lng == 0) return null;
    return LatLng(lat, lng);
  }

  LatLng? get _rider {
    final lat = widget.riderLat;
    final lng = widget.riderLng;
    if (lat == null || lng == null || lat == 0 || lng == 0) return null;
    if ((lat - accraLat).abs() < 0.001 && (lng - accraLng).abs() < 0.001) return null;
    return LatLng(lat, lng);
  }

  void _fitBounds() {
    final rider = _rider;
    final delivery = _delivery;
    final controller = _controller;
    if (controller == null) return;

    if (rider != null && delivery != null) {
      final bounds = LatLngBounds(
        southwest: LatLng(
          rider.latitude < delivery.latitude ? rider.latitude : delivery.latitude,
          rider.longitude < delivery.longitude ? rider.longitude : delivery.longitude,
        ),
        northeast: LatLng(
          rider.latitude > delivery.latitude ? rider.latitude : delivery.latitude,
          rider.longitude > delivery.longitude ? rider.longitude : delivery.longitude,
        ),
      );
      controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 64));
    } else if (delivery != null) {
      controller.animateCamera(CameraUpdate.newLatLngZoom(delivery, 15));
    } else if (rider != null) {
      controller.animateCamera(CameraUpdate.newLatLngZoom(rider, 15));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasGoogleMapsKey) {
      return Container(
        color: GetGasColors.bgCard2,
        alignment: Alignment.center,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.map_outlined, size: 40, color: GetGasColors.textMuted),
            const SizedBox(height: 12),
            const Text(
              'Map unavailable',
              style: TextStyle(fontWeight: FontWeight.w600, color: GetGasColors.text),
            ),
            const SizedBox(height: 4),
            const Text(
              'Run: dart run tool/sync_env.dart',
              style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
            ),
          ],
        ),
      );
    }

    if (_mapError) {
      return ColoredBox(
        color: GetGasColors.bgCard2,
        child: Center(
          child: Text(
            'Map failed to load.\nStop app and run flutter run again.',
            textAlign: TextAlign.center,
            style: TextStyle(color: GetGasColors.textMuted.withValues(alpha: 0.9), fontSize: 13),
          ),
        ),
      );
    }

    final delivery = _delivery;
    final rider = _rider;
    final center = delivery ?? rider ?? LatLng(accraLat, accraLng);

    final markers = <Marker>{};
    if (delivery != null) {
      markers.add(Marker(markerId: const MarkerId('delivery'), position: delivery, icon: BitmapDescriptor.defaultMarker));
    }
    if (rider != null) {
      markers.add(Marker(markerId: const MarkerId('rider'), position: rider, icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange)));
    }

    final polylines = <Polyline>{};
    if (rider != null && delivery != null) {
      polylines.add(Polyline(
        polylineId: const PolylineId('route'),
        points: [rider, delivery],
        color: GetGasColors.brand,
        width: 5,
      ));
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        GoogleMap(
          initialCameraPosition: CameraPosition(target: center, zoom: 14),
          markers: markers,
          polylines: polylines,
          myLocationButtonEnabled: false,
          zoomControlsEnabled: false,
          onMapCreated: (c) {
            _controller = c;
            _loadTimer?.cancel();
            if (mounted) setState(() => _mapReady = true);
            _fitBounds();
          },
        ),
        if (!_mapReady)
          const ColoredBox(
            color: GetGasColors.bgCard2,
            child: Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
          ),
      ],
    );
  }
}
