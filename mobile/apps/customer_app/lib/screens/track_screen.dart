import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../providers/api_providers.dart';
import '../providers/location_provider.dart';
import '../widgets/google_maps_config.dart';

Future<void> _cancelOrder(BuildContext context, WidgetRef ref, String orderId) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Cancel Order'),
      content: const Text('Are you sure you want to cancel this order?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
  if (confirmed != true) return;
  try {
    await ref.read(ordersApiProvider).cancel(orderId);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order cancelled')),
      );
      ref.invalidate(_trackOrdersProvider);
    }
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to cancel order')),
      );
    }
  }
}

class TrackScreen extends ConsumerStatefulWidget {
  const TrackScreen({super.key});

  @override
  ConsumerState<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends ConsumerState<TrackScreen> {
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.invalidate(_trackOrdersProvider);
      // Poll every 10s while on this screen so rider assignment is caught quickly
      _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        ref.invalidate(_trackOrdersProvider);
      });
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(_trackOrdersProvider);
    final location    = ref.watch(locationProvider);

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: ordersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (error, __) => SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Text('Track Order',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: GetGasColors.text)),
              ),
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 72, height: 72,
                          decoration: BoxDecoration(
                            color: GetGasColors.bgCard2,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(Icons.wifi_off_rounded, size: 34, color: GetGasColors.textMuted),
                        ),
                        const SizedBox(height: 20),
                        const Text('Could not load orders',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: GetGasColors.text)),
                        const SizedBox(height: 8),
                        const Text(
                          'Check your internet connection and try again.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, color: GetGasColors.textMuted, height: 1.5),
                        ),
                        const SizedBox(height: 28),
                        SizedBox(
                          width: double.infinity, height: 50,
                          child: ElevatedButton.icon(
                            onPressed: () => ref.invalidate(_trackOrdersProvider),
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
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        data: (active) {
          // Auto-redirect once rider is assigned
          if (active != null && ['accepted', 'at_station', 'en_route'].contains(active.status)) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) context.go('/track/${active.id}');
            });
            return const Center(child: CircularProgressIndicator(color: GetGasColors.brand));
          }

          if (active != null && active.status == 'pending') {
            return _PendingMapView(order: active, location: location);
          }

          return _EmptyView();
        },
      ),
    );
  }
}

// ── Pending: map + finding rider sheet ───────────────────────────────────────

class _PendingMapView extends StatefulWidget {
  const _PendingMapView({required this.order, required this.location});
  final GasOrder order;
  final LocationState location;

  @override
  State<_PendingMapView> createState() => _PendingMapViewState();
}

class _PendingMapViewState extends State<_PendingMapView> {
  GoogleMapController? _mapCtrl;

  LatLng get _userLatLng {
    final c = widget.location.coords;
    if (c != null) return LatLng(c.lat, c.lng);
    return const LatLng(accraLat, accraLng);
  }

  @override
  void dispose() {
    _mapCtrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const sheetH  = 340.0;

    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('user'),
        position: _userLatLng,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: const InfoWindow(title: 'Your location'),
      ),
    };

    return Stack(
      fit: StackFit.expand,
      children: [
        // ── Full-screen map ──
        Positioned(
          top: 0, left: 0, right: 0,
          bottom: sheetH - 24,
          child: AppConfig.hasGoogleMapsKey
              ? GoogleMap(
                  initialCameraPosition: CameraPosition(target: _userLatLng, zoom: 14),
                  markers: markers,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                          onMapCreated: (c) => _mapCtrl = c,
                )
              : Container(
                  color: const Color(0xFF1e1e2e),
                  child: const Center(
                    child: Text('Map unavailable', style: TextStyle(color: Color(0xFF6b7280))),
                  ),
                ),
        ),

        // ── Top gradient + header ──
        Positioned(
          top: 0, left: 0, right: 0,
          child: SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xCC000000), Colors.transparent],
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${widget.order.displayNumber}',
                          style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.7)),
                        ),
                        const Text(
                          'Finding your rider…',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── Bottom sheet ──
        Positioned(
          bottom: 0, left: 0, right: 0,
          height: sheetH,
          child: Container(
            decoration: const BoxDecoration(
              color: GetGasColors.bgCard,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                // Handle
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Center(
                    child: SizedBox(
                      width: 36, height: 4,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: GetGasColors.border,
                          borderRadius: BorderRadius.all(Radius.circular(2)),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: _FindingRiderSheet(order: widget.order),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Finding rider animated sheet ─────────────────────────────────────────────

class _FindingRiderSheet extends ConsumerStatefulWidget {
  const _FindingRiderSheet({required this.order});
  final GasOrder order;

  @override
  ConsumerState<_FindingRiderSheet> createState() => _FindingRiderSheetState();
}

class _FindingRiderSheetState extends ConsumerState<_FindingRiderSheet>
    with TickerProviderStateMixin {
  late final AnimationController _ring1;
  late final AnimationController _ring2;
  late final AnimationController _ring3;

  @override
  void initState() {
    super.initState();
    _ring1 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();
    _ring2 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
      ..forward(from: 0.33)
      ..addStatusListener((s) { if (s == AnimationStatus.completed) _ring2.repeat(); });
    _ring3 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
      ..forward(from: 0.66)
      ..addStatusListener((s) { if (s == AnimationStatus.completed) _ring3.repeat(); });
  }

  @override
  void dispose() {
    _ring1.dispose();
    _ring2.dispose();
    _ring3.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            // Animated ripple icon
            SizedBox(
              width: 56, height: 56,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  _RippleRing(ctrl: _ring1, color: GetGasColors.brand, size: 56),
                  _RippleRing(ctrl: _ring2, color: GetGasColors.brand, size: 56),
                  _RippleRing(ctrl: _ring3, color: GetGasColors.brand, size: 56),
                  Container(
                    width: 40, height: 40,
                    decoration: const BoxDecoration(color: GetGasColors.brand, shape: BoxShape.circle),
                    child: const Icon(Icons.two_wheeler_outlined, color: Colors.white, size: 20),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Finding your rider', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 2),
                  Text('This may take a few minutes', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Progress bar
        _PulsingProgressBar(),
        const SizedBox(height: 20),

        // Order summary
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: GetGasColors.bgCard2,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: GetGasColors.border),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Order #${widget.order.displayNumber}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('Pending', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B))),
                  ),
                ],
              ),
              if (widget.order.cylinders.isNotEmpty) ...[
                const SizedBox(height: 8),
                const Divider(height: 1, color: GetGasColors.border),
                const SizedBox(height: 8),
                ...widget.order.cylinders.map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Icon(Icons.local_fire_department_rounded, size: 14, color: GetGasColors.brand),
                      const SizedBox(width: 6),
                      Expanded(child: Text('${c.size}kg × ${c.quantity}', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted))),
                      Text('GHS ${c.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ],
                  ),
                )),
                const Divider(height: 12, color: GetGasColors.border),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text('GHS ${widget.order.displayTotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: GetGasColors.brand)),
                  ],
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => _cancelOrder(context, ref, widget.order.id),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red,
            side: const BorderSide(color: Colors.red),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
          child: const Text('Cancel Order', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}

class _RippleRing extends AnimatedWidget {
  const _RippleRing({required AnimationController ctrl, required this.color, required this.size})
      : super(listenable: ctrl);

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final value = (listenable as AnimationController).value;
    return Opacity(
      opacity: (1.0 - value).clamp(0.0, 1.0),
      child: Container(
        width: size * value,
        height: size * value,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: color, width: 2),
        ),
      ),
    );
  }
}

class _PulsingProgressBar extends StatefulWidget {
  @override
  State<_PulsingProgressBar> createState() => _PulsingProgressBarState();
}

class _PulsingProgressBarState extends State<_PulsingProgressBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 0.85).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(
          value: _anim.value,
          backgroundColor: GetGasColors.bgCard2,
          valueColor: const AlwaysStoppedAnimation<Color>(GetGasColors.brand),
          minHeight: 6,
        ),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Text('Track Order', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: GetGasColors.text)),
          ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        color: GetGasColors.brand.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.local_shipping_outlined, size: 36, color: GetGasColors.brand),
                    ),
                    const SizedBox(height: 20),
                    const Text('No active delivery', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: GetGasColors.text)),
                    const SizedBox(height: 8),
                    const Text(
                      'Place an order and track your rider\'s live location here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: GetGasColors.textMuted, height: 1.5),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity, height: 52,
                      child: ElevatedButton.icon(
                        onPressed: () => context.go('/'),
                        icon: const Icon(Icons.local_fire_department_rounded, size: 18),
                        label: const Text('Order Gas Now', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: GetGasColors.brand,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/orders'),
                      child: const Text('View order history', style: TextStyle(fontSize: 14, color: GetGasColors.brand, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _trackOrdersProvider = FutureProvider<GasOrder?>((ref) async {
  const active = ['awaiting_payment', 'pending', 'accepted', 'at_station', 'en_route'];
  final orders = await ref.watch(ordersApiProvider).list(
    status: active.join(','),
    limit: 50,
  );
  if (orders.isEmpty) return null;
  orders.sort((a, b) {
    final aDate = DateTime.tryParse(a.createdAt ?? '') ?? DateTime(0);
    final bDate = DateTime.tryParse(b.createdAt ?? '') ?? DateTime(0);
    return bDate.compareTo(aDate);
  });
  return orders.first;
});
