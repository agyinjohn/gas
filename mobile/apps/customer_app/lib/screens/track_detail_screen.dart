import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';
import '../providers/realtime_provider.dart';
import '../widgets/google_maps_config.dart';

// ─── Step definitions ─────────────────────────────────────────────────────────

const _statusOrder = [
  'pending', 'accepted', 'at_station', 'en_route', 'delivered'
];

const _steps = [
  (key: 'pending',    label: 'Placed',    icon: Icons.receipt_long_outlined),
  (key: 'accepted',   label: 'Rider',     icon: Icons.two_wheeler),
  (key: 'at_station', label: 'Pickup',    icon: Icons.store_outlined),
  (key: 'en_route',   label: 'En Route',  icon: Icons.navigation_outlined),
  (key: 'delivered',  label: 'Delivered', icon: Icons.check_circle_outline),
];

// ─── Track map ────────────────────────────────────────────────────────────────

class _TrackMap extends StatefulWidget {
  const _TrackMap({
    required this.riderLat,
    required this.riderLng,
    required this.deliveryLat,
    required this.deliveryLng,
  });

  final double? riderLat;
  final double? riderLng;
  final double? deliveryLat;
  final double? deliveryLng;

  @override
  State<_TrackMap> createState() => _TrackMapState();
}

class _TrackMapState extends State<_TrackMap> {
  GoogleMapController? _ctrl;
  bool _ready = false;
  Timer? _loadTimer;

  @override
  void initState() {
    super.initState();
    _loadTimer = Timer(const Duration(seconds: 12), () {
      if (mounted && !_ready) setState(() {});
    });
  }

  @override
  void dispose() {
    _loadTimer?.cancel();
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _TrackMap old) {
    super.didUpdateWidget(old);
    if (old.riderLat != widget.riderLat || old.riderLng != widget.riderLng) {
      _fitBounds();
    }
  }

  LatLng? get _rider {
    final lat = widget.riderLat, lng = widget.riderLng;
    if (lat == null || lng == null || lat == 0 || lng == 0) return null;
    if ((lat - accraLat).abs() < 0.001 && (lng - accraLng).abs() < 0.001) return null;
    return LatLng(lat, lng);
  }

  LatLng? get _delivery {
    final lat = widget.deliveryLat, lng = widget.deliveryLng;
    if (lat == null || lng == null || lat == 0 || lng == 0) return null;
    return LatLng(lat, lng);
  }

  void _fitBounds() {
    final ctrl = _ctrl;
    final r = _rider, d = _delivery;
    if (ctrl == null) return;
    if (r != null && d != null) {
      ctrl.animateCamera(CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(
            r.latitude < d.latitude ? r.latitude : d.latitude,
            r.longitude < d.longitude ? r.longitude : d.longitude,
          ),
          northeast: LatLng(
            r.latitude > d.latitude ? r.latitude : d.latitude,
            r.longitude > d.longitude ? r.longitude : d.longitude,
          ),
        ),
        80,
      ));
    } else if (d != null) {
      ctrl.animateCamera(CameraUpdate.newLatLngZoom(d, 15));
    } else if (r != null) {
      ctrl.animateCamera(CameraUpdate.newLatLngZoom(r, 15));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!AppConfig.hasGoogleMapsKey) {
      return const ColoredBox(
        color: Color(0xFF1e1e2e),
        child: Center(
          child: Text(
            'Run: dart run tool/sync_env.dart',
            style: TextStyle(color: Color(0xFF6b7280), fontSize: 12),
          ),
        ),
      );
    }

    final rider    = _rider;
    final delivery = _delivery;
    final center   = delivery ?? rider ?? const LatLng(accraLat, accraLng);

    final markers = <Marker>{};
    if (delivery != null) {
      markers.add(Marker(
        markerId: const MarkerId('delivery'),
        position: delivery,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      ));
    }
    if (rider != null) {
      markers.add(Marker(
        markerId: const MarkerId('rider'),
        position: rider,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      ));
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
          mapToolbarEnabled: false,
          style: googleMapDarkStyle,
          onMapCreated: (c) {
            _ctrl = c;
            _loadTimer?.cancel();
            if (mounted) setState(() => _ready = true);
            _fitBounds();
          },
        ),
        if (!_ready)
          const ColoredBox(
            color: Color(0xFF1e1e2e),
            child: Center(
              child: CircularProgressIndicator(color: GetGasColors.brand),
            ),
          ),
      ],
    );
  }
}

// ─── Progress steps ───────────────────────────────────────────────────────────

class _ProgressSteps extends StatelessWidget {
  const _ProgressSteps({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final currentIdx = _statusOrder.indexOf(status);
    return Row(
      children: List.generate(_steps.length, (i) {
        final stepIdx  = _statusOrder.indexOf(_steps[i].key);
        final done     = currentIdx > stepIdx;
        final active   = currentIdx == stepIdx;
        final isLast   = i == _steps.length - 1;

        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: done
                            ? const Color(0xFF22c55e)
                            : active
                                ? GetGasColors.brand
                                : const Color(0xFFF0F0F0),
                        shape: BoxShape.circle,
                      ),
                      child: done
                          ? const Icon(Icons.check, size: 16, color: Colors.white)
                          : Icon(
                              _steps[i].icon,
                              size: 16,
                              color: active ? Colors.white : GetGasColors.textMuted,
                            ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _steps[i].label,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                        color: active
                            ? GetGasColors.brand
                            : done
                                ? const Color(0xFF22c55e)
                                : GetGasColors.textMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 20),
                    color: done
                        ? const Color(0xFF22c55e)
                        : const Color(0xFFE5E7EB),
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }
}

// ─── Sheet content ────────────────────────────────────────────────────────────

class _SheetContent extends StatelessWidget {
  const _SheetContent({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    final rider = order.rider;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Progress steps
        _ProgressSteps(status: order.status),

        const SizedBox(height: 20),

        // Rider card
        if (rider != null && rider.name.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: GetGasColors.brand.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      rider.name.isNotEmpty
                          ? rider.name[0].toUpperCase()
                          : 'R',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: GetGasColors.brand,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rider.name,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: GetGasColors.text,
                        ),
                      ),
                      const Text(
                        'Your delivery rider',
                        style: TextStyle(
                          fontSize: 12,
                          color: GetGasColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Chat button (placeholder)
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: GetGasColors.bgCard,
                    shape: BoxShape.circle,
                    border: Border.all(color: GetGasColors.border),
                  ),
                  child: const Icon(
                    Icons.message_outlined,
                    size: 18,
                    color: GetGasColors.textMuted,
                  ),
                ),
                const SizedBox(width: 8),
                // Call button
                if (rider.phone.isNotEmpty)
                  GestureDetector(
                    onTap: () =>
                        launchUrl(Uri.parse('tel:${rider.phone}')),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: GetGasColors.brand,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.phone,
                        size: 18,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Order details card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF0F0F0),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Order Details',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: GetGasColors.text,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF22c55e).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      _paymentLabel(order.paymentMethod),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF16a34a),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Cylinders
              ...order.cylinders.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: GetGasColors.brand.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.local_fire_department_rounded,
                            size: 14,
                            color: GetGasColors.brand,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '${c.size}kg × ${c.quantity}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: GetGasColors.textMuted,
                            ),
                          ),
                        ),
                        Text(
                          'GHS ${c.subtotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: GetGasColors.text,
                          ),
                        ),
                      ],
                    ),
                  )),

              const Divider(color: GetGasColors.border, height: 20),

              // Delivery fee
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Delivery Fee',
                    style: TextStyle(
                        fontSize: 12, color: GetGasColors.textMuted),
                  ),
                  Text(
                    'GHS ${(order.deliveryFee ?? 0).toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: GetGasColors.text,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: GetGasColors.text,
                    ),
                  ),
                  Text(
                    'GHS ${order.displayTotal.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: GetGasColors.brand,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _paymentLabel(String? method) {
    switch (method) {
      case 'mobile_money': return 'Paid via MoMO';
      case 'card':         return 'Paid via Card';
      default:             return 'Cash on Delivery';
    }
  }
}

// ─── Main screen ──────────────────────────────────────────────────────────────

class TrackDetailScreen extends ConsumerStatefulWidget {
  const TrackDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<TrackDetailScreen> createState() => _TrackDetailScreenState();
}

class _TrackDetailScreenState extends ConsumerState<TrackDetailScreen> {
  // Sheet height as fraction of screen (matches web: 0.52 default, 0.10 collapsed)
  double _sheetFraction = 0.52;
  double _dragStartFraction = 0.52;
  double? _dragStartY;

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_trackOrderProvider(widget.orderId));
    final tracking   = ref.watch(orderTrackingProvider(widget.orderId));
    final screenH    = MediaQuery.of(context).size.height;

    return Scaffold(
      backgroundColor: const Color(0xFF1e1e2e),
      body: orderAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: GetGasColors.brand),
        ),
        error: (error, __) => SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F2937),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.wifi_off_rounded, size: 34, color: Color(0xFF6B7280)),
                  ),
                  const SizedBox(height: 20),
                  const Text('Could not load order',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text(
                    'Check your internet connection and try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF), height: 1.5),
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: ElevatedButton.icon(
                      onPressed: () => ref.invalidate(_trackOrderProvider(widget.orderId)),
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Try Again',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: GetGasColors.brand,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: () => context.go('/'),
                    icon: const Icon(Icons.arrow_back, size: 16, color: Color(0xFF9CA3AF)),
                    label: const Text('Go Home',
                        style: TextStyle(fontSize: 14, color: Color(0xFF9CA3AF))),
                  ),
                ],
              ),
            ),
          ),
        ),
        data: (order) {
          _seedRiderLocation(order, tracking);

          final status   = tracking.statusOverride ?? order.status;
          final riderLat = tracking.riderLat;
          final riderLng = tracking.riderLng;
          final addr     = order.deliveryAddress;
          final sheetH   = screenH * _sheetFraction;

          return Stack(
            fit: StackFit.expand,
            children: [
              // ── Full-screen map ──
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                bottom: sheetH,
                child: _TrackMap(
                  riderLat: riderLat,
                  riderLng: riderLng,
                  deliveryLat: addr?.lat,
                  deliveryLng: addr?.lng,
                ),
              ),

              // ── Gradient overlay on map ──
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0xCC000000), Colors.transparent],
                      ),
                    ),
                    child: Row(
                      children: [
                        // Back button
                        GestureDetector(
                          onTap: () => context.canPop()
                              ? context.pop()
                              : context.go('/'),
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Icon(
                              Icons.arrow_back,
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Order #${order.displayNumber}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.white.withValues(alpha: 0.7),
                                ),
                              ),
                              Text(
                                orderStatusLabel(status),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Expand / collapse toggle
                        GestureDetector(
                          onTap: () => setState(() {
                            _sheetFraction =
                                _sheetFraction > 0.2 ? 0.10 : 0.52;
                          }),
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Icon(
                              _sheetFraction > 0.2
                                  ? Icons.keyboard_arrow_down
                                  : Icons.keyboard_arrow_up,
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // ── "Open in Maps" button ──
              if (riderLat != null && riderLng != null)
                Positioned(
                  bottom: sheetH + 12,
                  right: 12,
                  child: GestureDetector(
                    onTap: () => launchUrl(
                      Uri.parse(
                          'https://maps.google.com/?q=$riderLat,$riderLng'),
                      mode: LaunchMode.externalApplication,
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x33000000),
                            blurRadius: 8,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.navigation,
                              size: 14, color: Color(0xFF1A1A1A)),
                          SizedBox(width: 6),
                          Text(
                            'Open in Maps',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1A1A1A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // ── Draggable bottom sheet ──
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: sheetH,
                child: Container(
                  decoration: const BoxDecoration(
                    color: GetGasColors.bgCard,
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Column(
                    children: [
                      // Drag handle
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onVerticalDragStart: (d) {
                          _dragStartY = d.globalPosition.dy;
                          _dragStartFraction = _sheetFraction;
                        },
                        onVerticalDragUpdate: (d) {
                          if (_dragStartY == null) return;
                          final dy = _dragStartY! - d.globalPosition.dy;
                          final newF = _dragStartFraction +
                              (dy / screenH);
                          setState(() {
                            _sheetFraction = newF.clamp(0.10, 0.75);
                          });
                        },
                        onVerticalDragEnd: (_) {
                          setState(() {
                            _sheetFraction =
                                _sheetFraction < 0.30 ? 0.10 : 0.52;
                          });
                          _dragStartY = null;
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Center(
                            child: Container(
                              width: 36,
                              height: 4,
                              decoration: BoxDecoration(
                                color: GetGasColors.border,
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Sheet body
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                          child: _SheetContent(order: order..copyWithStatus(status)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _seedRiderLocation(GasOrder order, OrderTrackingState tracking) {
    final loc = order.rider?.location;
    if (loc == null || !loc.isValid || loc.isStaleSeed) return;
    if (tracking.riderLat != null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(orderTrackingProvider(widget.orderId).notifier)
          .seedRiderLocation(loc.lat, loc.lng);
    });
  }
}

extension on GasOrder {
  GasOrder copyWithStatus(String s) => s == status ? this : GasOrder(
    id: id, orderNumber: orderNumber, status: s,
    estimatedArrival: estimatedArrival, totalAmount: totalAmount,
    finalAmount: finalAmount, deliveryFee: deliveryFee, createdAt: createdAt,
    paymentMethod: paymentMethod, cylinders: cylinders,
    deliveryAddress: deliveryAddress, pickupAddress: pickupAddress,
    station: station, rider: rider, scheduledFor: scheduledFor,
    paystackReference: paystackReference, riderRating: riderRating,
  );
}

final _trackOrderProvider =
    FutureProvider.family<GasOrder, String>((ref, id) {
  return ref.watch(ordersApiProvider).getById(id);
});
