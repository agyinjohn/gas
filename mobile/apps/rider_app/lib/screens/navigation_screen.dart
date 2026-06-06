import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';
import '../services/cache_service.dart';

class NavigationScreen extends ConsumerStatefulWidget {
  const NavigationScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends ConsumerState<NavigationScreen> {
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
  bool _followRider = true;

  static const _rerouteThresholdDeg = 0.0003;

  @override
  void initState() {
    super.initState();
    _initPosition();
    _startTracking();
  }

  // Get current position immediately — don't wait for background stream
  Future<void> _initPosition() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      if (mounted) _onLatLng(pos.latitude, pos.longitude);
    } catch (_) {}
  }

  @override
  void dispose() {
    _locationSub?.cancel();
    _ctrl?.dispose();
    super.dispose();
  }

  void _startTracking() {
    _locationSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((pos) => _onLatLng(pos.latitude, pos.longitude), onError: (_) {});
  }

  void _onLatLng(double lat, double lng) {
    if (!mounted) return;
    final ll = LatLng(lat, lng);
    setState(() => _riderPos = ll);
    if (_followRider && _routePoints.isEmpty) {
      _ctrl?.animateCamera(CameraUpdate.newLatLng(ll));
    }
    final prev = _lastRouteOrigin;
    if (prev == null || _dist(ll, prev) > _rerouteThresholdDeg) {
      if (!_loadingRoute) {
        final order = ref.read(_navOrderProvider(widget.orderId)).valueOrNull;
        if (order != null && _destination(order) != null) {
          _fetchRoute(ll, _destination(order)!);
        }
      }
    }
  }

  Future<void> _fetchRoute(LatLng origin, LatLng dest) async {
    if (!AppConfig.hasGoogleMapsKey) return;
    _polylinePoints ??= PolylinePoints.legacy(AppConfig.googleMapsApiKey);
    setState(() => _loadingRoute = true);
    try {
      // ignore: deprecated_member_use
      final result = await _polylinePoints!.getRouteBetweenCoordinates(
        // ignore: deprecated_member_use
        request: PolylineRequest(
          origin: PointLatLng(origin.latitude, origin.longitude),
          destination: PointLatLng(dest.latitude, dest.longitude),
          mode: TravelMode.driving,
        ),
      );
      if (!mounted) return;
      if (result.points.isNotEmpty) {
        _lastRouteOrigin = origin;
        _routePoints =
            result.points.map((p) => LatLng(p.latitude, p.longitude)).toList();
      }
      if (result.durationTexts?.isNotEmpty == true) {
        _eta = result.durationTexts!.first;
      }
      if (result.distanceTexts?.isNotEmpty == true) {
        _distance = result.distanceTexts!.first;
      }
      setState(() {});
      _fitBounds(dest);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingRoute = false);
    }
  }

  void _fitBounds(LatLng dest) {
    final rider = _riderPos;
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

  LatLng? _destination(GasOrder order) {
    final addr = order.deliveryAddress;
    if (addr == null) return null;
    return LatLng(addr.lat, addr.lng);
  }

  String _destinationLabel(GasOrder order) {
    if (order.status == 'accepted') return 'Customer — Pickup';
    if (order.status == 'en_route') return 'Customer — Delivery';
    return 'Destination';
  }

  Set<Marker> _markers(LatLng dest, String label) {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('dest'),
        position: dest,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(title: label),
      ),
    };
    if (_riderPos != null) {
      markers.add(Marker(
        markerId: const MarkerId('rider'),
        position: _riderPos!,
        icon:
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
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
        width: 6,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_navOrderProvider(widget.orderId));

    return Scaffold(
      body: orderAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Could not load navigation',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(_navOrderProvider(widget.orderId)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: GetGasColors.brand,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (order) {
          final dest = _destination(order);
          // Kick off route as soon as order loads if position is already known
          // and no route has been fetched yet (covers the position-arrives-first race)
          if (dest != null && _riderPos != null && _lastRouteOrigin == null && !_loadingRoute) {
            SchedulerBinding.instance.addPostFrameCallback(
              (_) => _fetchRoute(_riderPos!, dest),
            );
          }
          if (dest == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_off_rounded,
                      size: 48, color: GetGasColors.textMuted),
                  const SizedBox(height: 12),
                  const Text('No destination available for this order step',
                      style: TextStyle(
                          fontSize: 14, color: GetGasColors.textMuted),
                      textAlign: TextAlign.center),
                  const SizedBox(height: 20),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          }

          final label = _destinationLabel(order);
          final center = _riderPos ?? dest;

          return Stack(
            children: [
              // ── Full-screen map ──
              GoogleMap(
                initialCameraPosition:
                    CameraPosition(target: center, zoom: 15),
                markers: _markers(dest, label),
                polylines: _polylines,
                myLocationButtonEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                mapType: MapType.normal,
                onMapCreated: (c) {
                  _ctrl = c;
                  if (mounted) setState(() => _mapReady = true);
                  _fitBounds(dest);
                },
                onCameraMoveStarted: () {
                  if (_followRider) setState(() => _followRider = false);
                },
              ),

              if (!_mapReady)
                const ColoredBox(
                  color: Color(0xFF1e1e2e),
                  child: Center(
                    child:
                        CircularProgressIndicator(color: GetGasColors.brand),
                  ),
                ),

              // ── Top bar ──
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                    child: Row(
                      children: [
                        // Back button
                        GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: const [
                                BoxShadow(
                                    color: Color(0x22000000),
                                    blurRadius: 8,
                                    offset: Offset(0, 2))
                              ],
                            ),
                            child: const Icon(Icons.arrow_back,
                                size: 20, color: Color(0xFF1A1A1A)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        // ETA / distance card
                        if (_eta != null || _distance != null)
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: const [
                                  BoxShadow(
                                      color: Color(0x22000000),
                                      blurRadius: 8,
                                      offset: Offset(0, 2))
                                ],
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceEvenly,
                                children: [
                                  if (_eta != null)
                                    Row(children: [
                                      const Icon(Icons.access_time_rounded,
                                          size: 14,
                                          color: GetGasColors.brand),
                                      const SizedBox(width: 4),
                                      Text(_eta!,
                                          style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w800,
                                              color: GetGasColors.text)),
                                    ]),
                                  if (_eta != null && _distance != null)
                                    Container(
                                        width: 1,
                                        height: 16,
                                        color: GetGasColors.border),
                                  if (_distance != null)
                                    Row(children: [
                                      const Icon(Icons.straighten_rounded,
                                          size: 14,
                                          color: GetGasColors.textMuted),
                                      const SizedBox(width: 4),
                                      Text(_distance!,
                                          style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: GetGasColors.textMuted)),
                                    ]),
                                ],
                              ),
                            ),
                          )
                        else
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: const [
                                  BoxShadow(
                                      color: Color(0x22000000),
                                      blurRadius: 8,
                                      offset: Offset(0, 2))
                                ],
                              ),
                              child: Text(
                                label,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: GetGasColors.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── Map control buttons ──
              Positioned(
                right: 12,
                bottom: 200,
                child: Column(
                  children: [
                    // Re-center / follow rider
                    GestureDetector(
                      onTap: () {
                        setState(() => _followRider = true);
                        if (_riderPos != null) {
                          _routePoints.isEmpty
                              ? _ctrl?.animateCamera(CameraUpdate.newLatLng(_riderPos!))
                              : _fitBounds(dest);
                        }
                      },
                      child: Container(
                        width: 44,
                        height: 44,
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: _followRider
                              ? GetGasColors.brand
                              : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: const [
                            BoxShadow(
                                color: Color(0x22000000),
                                blurRadius: 6,
                                offset: Offset(0, 2))
                          ],
                        ),
                        child: Icon(Icons.my_location_rounded,
                            size: 20,
                            color: _followRider
                                ? Colors.white
                                : GetGasColors.textMuted),
                      ),
                    ),
                    // Fit both markers
                    GestureDetector(
                      onTap: () => _fitBounds(dest),
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: const [
                            BoxShadow(
                                color: Color(0x22000000),
                                blurRadius: 6,
                                offset: Offset(0, 2))
                          ],
                        ),
                        child: const Icon(Icons.zoom_out_map_rounded,
                            size: 20, color: GetGasColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Bottom destination card ──
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  top: false,
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(
                            color: Color(0x22000000),
                            blurRadius: 16,
                            offset: Offset(0, -4))
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: GetGasColors.brand
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.location_on_rounded,
                                  size: 20, color: GetGasColors.brand),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    label.toUpperCase(),
                                    style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700,
                                        color: GetGasColors.textMuted,
                                        letterSpacing: 0.8),
                                  ),
                                  Text(
                                    order.deliveryAddress != null
                                        ? '${order.deliveryAddress!.street}'
                                            '${order.deliveryAddress!.city.isNotEmpty ? ', ${order.deliveryAddress!.city}' : ''}'
                                        : 'Destination',
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: GetGasColors.text),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            // Open in Google Maps
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => launchUrl(
                                  Uri.parse(
                                      'https://maps.google.com/?q=${dest.latitude},${dest.longitude}'),
                                  mode: LaunchMode.externalApplication,
                                ),
                                icon: const Icon(Icons.map_outlined, size: 16),
                                label: const Text('Google Maps'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: GetGasColors.text,
                                  side: const BorderSide(
                                      color: GetGasColors.border),
                                  minimumSize: const Size(0, 44),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                  textStyle: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            // Back to order detail
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => context.pop(),
                                icon: const Icon(
                                    Icons.receipt_long_outlined,
                                    size: 16),
                                label: const Text('Order Details'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: GetGasColors.brand,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(0, 44),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(12)),
                                  textStyle: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _navOrderProvider =
    FutureProvider.family<GasOrder, String>((ref, id) async {
  final cached = await CacheService.loadOrder(id);
  if (cached != null) return GasOrder.fromJson(cached);
  final order = await ref.read(ordersApiProvider).getById(id);
  await CacheService.saveOrder(id, order.toJson());
  return order;
});
