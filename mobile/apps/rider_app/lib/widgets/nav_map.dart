import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class NavMap extends ConsumerStatefulWidget {
  const NavMap({
    super.key,
    required this.destination,
    required this.destinationLabel,
    required this.orderId,
    required this.riderId,
    required this.instructionLabel,
  });

  final LatLng destination;
  final String destinationLabel;
  final String orderId;
  final String riderId;
  final String instructionLabel;

  @override
  ConsumerState<NavMap> createState() => _NavMapState();
}

class _NavMapState extends ConsumerState<NavMap> {
  GoogleMapController? _ctrl;
  StreamSubscription<Position>? _locationSub;
  PolylinePoints? _polylinePoints;

  LatLng? _riderPos;
  LatLng? _lastRouteOrigin;
  List<LatLng> _routePoints = [];
  String? _eta;
  String? _distance;
  bool _mapReady = false;
  bool _loadingRoute = false;

  static const _rerouteThresholdDeg = 0.0003;

  @override
  void initState() {
    super.initState();
    _startTracking();
  }

  @override
  void dispose() {
    _locationSub?.cancel();
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant NavMap old) {
    super.didUpdateWidget(old);
    if (old.destination != widget.destination) {
      _lastRouteOrigin = null;
      _routePoints = [];
      _eta = null;
      _distance = null;
      if (_riderPos != null) _fetchRoute(_riderPos!);
    }
  }

  Future<void> _startTracking() async {
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) return;

    // Get current position immediately to draw route on open
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      _onPosition(pos);
    } catch (_) {}

    // Stream updates as rider moves
    _locationSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen(_onPosition, onError: (_) {});
  }

  void _onPosition(Position pos) {
    if (!mounted) return;
    final ll = LatLng(pos.latitude, pos.longitude);
    setState(() => _riderPos = ll);
    _ctrl?.animateCamera(CameraUpdate.newLatLng(ll));
    final prev = _lastRouteOrigin;
    if (prev == null || _dist(ll, prev) > _rerouteThresholdDeg) {
      if (!_loadingRoute) _fetchRoute(ll);
    }
  }

  Future<void> _fetchRoute(LatLng origin) async {
    if (!AppConfig.hasGoogleMapsKey) return;
    _polylinePoints ??= PolylinePoints.legacy(AppConfig.googleMapsApiKey);
    setState(() => _loadingRoute = true);
    try {
      // ignore: deprecated_member_use
      final result = await _polylinePoints!.getRouteBetweenCoordinates(
        // ignore: deprecated_member_use
        request: PolylineRequest(
          origin: PointLatLng(origin.latitude, origin.longitude),
          destination: PointLatLng(
              widget.destination.latitude, widget.destination.longitude),
          mode: TravelMode.driving,
        ),
      );
      if (!mounted) return;
      if (result.points.isNotEmpty) {
        _lastRouteOrigin = origin;
        _routePoints =
            result.points.map((p) => LatLng(p.latitude, p.longitude)).toList();
      }
      if (result.durationTexts != null && result.durationTexts!.isNotEmpty) {
        _eta = result.durationTexts!.first;
      }
      if (result.distanceTexts != null && result.distanceTexts!.isNotEmpty) {
        _distance = result.distanceTexts!.first;
      }
      setState(() {});
      _fitBounds();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingRoute = false);
    }
  }

  void _fitBounds() {
    final rider = _riderPos;
    final dest = widget.destination;
    if (rider == null || _ctrl == null) return;
    final bounds = LatLngBounds(
      southwest: LatLng(
        min(rider.latitude, dest.latitude),
        min(rider.longitude, dest.longitude),
      ),
      northeast: LatLng(
        max(rider.latitude, dest.latitude),
        max(rider.longitude, dest.longitude),
      ),
    );
    _ctrl!.animateCamera(CameraUpdate.newLatLngBounds(bounds, 80));
  }

  double _dist(LatLng a, LatLng b) {
    final dlat = a.latitude - b.latitude;
    final dlng = a.longitude - b.longitude;
    return sqrt(dlat * dlat + dlng * dlng);
  }

  Set<Marker> get _markers {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('dest'),
        position: widget.destination,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: widget.destinationLabel),
      ),
    };
    if (_riderPos != null) {
      markers.add(Marker(
        markerId: const MarkerId('rider'),
        position: _riderPos!,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
        infoWindow: const InfoWindow(title: 'You'),
        zIndexInt: 10,
      ));
    }
    return markers;
  }

  Set<Polyline> get _polylines {
    if (_routePoints.isEmpty) return {};
    return {
      Polyline(
        polylineId: const PolylineId('route'),
        points: _routePoints,
        color: GetGasColors.brand,
        width: 5,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasGoogleMapsKey) return const SizedBox.shrink();

    final center = _riderPos ?? widget.destination;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(19)),
            child: SizedBox(
              height: 220,
              child: Stack(
                children: [
                  GoogleMap(
                    initialCameraPosition:
                        CameraPosition(target: center, zoom: 15),
                    markers: _markers,
                    polylines: _polylines,
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    mapToolbarEnabled: false,
                    onMapCreated: (c) {
                      _ctrl = c;
                      if (mounted) setState(() => _mapReady = true);
                      if (_riderPos != null) _fitBounds();
                    },
                  ),
                  if (!_mapReady)
                    const ColoredBox(
                      color: Color(0xFF1e1e2e),
                      child: Center(
                        child: CircularProgressIndicator(color: GetGasColors.brand),
                      ),
                    ),
                  if (_eta != null || _distance != null)
                    Positioned(
                      top: 10, left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xE6000000),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_eta != null) ...[
                              const Icon(Icons.access_time, size: 12, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(_eta!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                            ],
                            if (_eta != null && _distance != null) const SizedBox(width: 8),
                            if (_distance != null) ...[
                              const Icon(Icons.straighten, size: 12, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(_distance!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                            ],
                          ],
                        ),
                      ),
                    ),
                  Positioned(
                    top: 10, right: 10,
                    child: GestureDetector(
                      onTap: _fitBounds,
                      child: Container(
                        width: 34, height: 34,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 6, offset: Offset(0, 2))],
                        ),
                        child: const Icon(Icons.center_focus_strong, size: 18, color: Color(0xFF1A1A1A)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: GetGasColors.bgCard,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(19)),
            ),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: GetGasColors.brand.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.navigation_outlined, size: 18, color: GetGasColors.brand),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.instructionLabel.toUpperCase(),
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: GetGasColors.textMuted, letterSpacing: 0.6),
                      ),
                      Text(widget.destinationLabel,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => launchUrl(
                    Uri.parse('https://maps.google.com/?q=${widget.destination.latitude},${widget.destination.longitude}'),
                    mode: LaunchMode.externalApplication,
                  ),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: GetGasColors.brand,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.navigation, size: 13, color: Colors.white),
                        SizedBox(width: 4),
                        Text('Maps', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

