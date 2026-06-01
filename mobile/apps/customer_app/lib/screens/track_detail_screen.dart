import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';
import '../providers/realtime_provider.dart';
import '../widgets/order_timeline.dart';
import '../widgets/google_map_location_picker.dart';

class TrackDetailScreen extends ConsumerStatefulWidget {
  const TrackDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<TrackDetailScreen> createState() => _TrackDetailScreenState();
}

class _TrackDetailScreenState extends ConsumerState<TrackDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_trackOrderProvider(widget.orderId));
    final tracking = ref.watch(orderTrackingProvider(widget.orderId));

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: orderAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => const Center(child: Text('Could not load order')),
        data: (order) {
          _seedRiderLocation(order, tracking);

          final status = tracking.statusOverride ?? order.status;
          final riderLat = tracking.riderLat;
          final riderLng = tracking.riderLng;
          final addr = order.deliveryAddress;

          return Column(
            children: [
              _header(context, order, status),
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    GoogleTrackMapView(
                      riderLat: riderLat,
                      riderLng: riderLng,
                      deliveryLat: addr?.lat,
                      deliveryLng: addr?.lng,
                    ),
                    DraggableScrollableSheet(
                      initialChildSize: 0.38,
                      minChildSize: 0.22,
                      maxChildSize: 0.72,
                      builder: (context, scrollController) {
                        return Container(
                          decoration: const BoxDecoration(
                            color: GetGasColors.bgCard,
                            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                            border: Border(top: BorderSide(color: GetGasColors.border)),
                          ),
                          child: ListView(
                            controller: scrollController,
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                            children: [
                              Center(
                                child: Container(
                                  width: 40,
                                  height: 4,
                                  margin: const EdgeInsets.only(bottom: 12),
                                  decoration: BoxDecoration(
                                    color: GetGasColors.border,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ),
                              Text(
                                orderStatusLabel(status),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '#${order.displayNumber}',
                                style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                              ),
                              const SizedBox(height: 16),
                              OrderTimeline(status: status),
                              if (order.rider != null && order.rider!.name.isNotEmpty) ...[
                                const SizedBox(height: 16),
                                _riderCard(order.rider!),
                              ],
                              const SizedBox(height: 16),
                              _summary(order),
                              const SizedBox(height: 12),
                              if (riderLat != null && riderLng != null)
                                OutlinedButton.icon(
                                  onPressed: () => launchUrl(
                                    Uri.parse('https://maps.google.com/?q=$riderLat,$riderLng'),
                                    mode: LaunchMode.externalApplication,
                                  ),
                                  icon: const Icon(Icons.navigation_outlined, size: 18),
                                  label: const Text('Open rider in Maps'),
                                ),
                              const SizedBox(height: 8),
                              OutlinedButton(
                                onPressed: () => context.push('/orders/${order.id}'),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size(double.infinity, 48),
                                  side: const BorderSide(color: GetGasColors.border),
                                ),
                                child: const Text('View full order details'),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
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
      ref.read(orderTrackingProvider(widget.orderId).notifier).seedRiderLocation(loc.lat, loc.lng);
    });
  }

  Widget _header(BuildContext context, GasOrder order, String status) {
    return Material(
      color: GetGasColors.bgCard,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(8, 8, 16, 12),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: GetGasColors.border)),
          ),
          child: Row(
            children: [
              IconButton(
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/track');
                  }
                },
                icon: const Icon(Icons.arrow_back),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('#${order.displayNumber}', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                    Text(orderStatusLabel(status), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _riderCard(OrderRider rider) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: GetGasColors.brand.withValues(alpha: 0.15),
            child: const Icon(Icons.person, color: GetGasColors.brand),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(rider.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (rider.phone.isNotEmpty)
                  Text(rider.phone, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
              ],
            ),
          ),
          if (rider.phone.isNotEmpty)
            IconButton(
              onPressed: () => launchUrl(Uri.parse('tel:${rider.phone}')),
              icon: const Icon(Icons.phone, color: GetGasColors.brand),
            ),
        ],
      ),
    );
  }

  Widget _summary(GasOrder order) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('GHS ${order.displayTotal}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: GetGasColors.brand)),
        Text(paymentMethodLabel(order.paymentMethod), style: const TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
        if (order.deliveryAddress?.street.isNotEmpty == true) ...[
          const SizedBox(height: 6),
          Text(order.deliveryAddress!.street, style: const TextStyle(fontSize: 13)),
        ],
      ],
    );
  }
}

final _trackOrderProvider = FutureProvider.family<GasOrder, String>((ref, id) {
  return ref.watch(ordersApiProvider).getById(id);
});
