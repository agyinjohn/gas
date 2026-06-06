import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../providers/api_providers.dart';
import '../providers/connectivity_provider.dart';
import '../providers/home_providers.dart';
import '../services/cache_service.dart';
import '../services/mutation_queue_service.dart';
import '../widgets/nav_map.dart';

// ── Step config ───────────────────────────────────────────────────────────────

const _steps = [
  (status: 'accepted',   label: 'Go to Customer',         icon: Icons.person_outline),
  (status: 'at_station', label: 'Go to Station',           icon: Icons.store_outlined),
  (status: 'en_route',   label: 'Return to Customer',      icon: Icons.two_wheeler_rounded),
  (status: 'delivered',  label: 'Delivered',               icon: Icons.check_circle_outline),
];

const _statusIndex = {
  'accepted': 0, 'at_station': 1, 'en_route': 2, 'delivered': 3,
};

const _statusActions = {
  'accepted':   (label: 'Confirm Pickup — Enter Customer OTP', next: 'at_station'),
  'at_station': (label: 'Cylinder Filled — En Route to Customer', next: 'en_route'),
  'en_route':   (label: 'Mark as Delivered — Enter Customer OTP', next: 'delivered'),
};

// These transitions require OTP entry before proceeding
const _otpRequired = {'accepted', 'en_route'};

const _paymentLabels = {
  'mobile_money': 'Mobile Money',
  'card':         'Card',
  'cash':         'Cash on Delivery',
};

// ── Screen ────────────────────────────────────────────────────────────────────

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _loading = false;

  Future<void> _updateStatus(GasOrder order) async {
    final action = _statusActions[order.status];
    if (action == null) return;

    // OTP-gated transitions: show dialog first
    if (_otpRequired.contains(order.status)) {
      await _showOtpDialog(order);
      return;
    }

    // Non-OTP transitions (at_station → en_route)
    final isOnline = ref.read(isOnlineProvider);
    setState(() => _loading = true);
    try {
      if (!isOnline) {
        await MutationQueueService.enqueue(QueuedMutation(
          type: MutationType.orderEnRoute,
          payload: {'orderId': order.id},
          queuedAt: DateTime.now(),
        ));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Queued — will sync when back online')),
          );
        }
        return;
      }
      await ref.read(ridersApiProvider).departedForDelivery(order.id);
      ref.invalidate(_orderProvider(widget.orderId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showOtpDialog(GasOrder order) async {
    final ctrl = TextEditingController();
    final isCash = order.paymentMethod == 'cash';
    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          isCash ? 'Confirm Pickup' : 'Confirm Delivery',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isCash
                  ? 'Ask the customer for their 4-digit OTP to confirm you collected the cash payment.'
                  : 'Ask the customer for their 4-digit OTP to confirm delivery.',
              style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.number,
              maxLength: 4,
              autofocus: true,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 12),
              decoration: InputDecoration(
                counterText: '',
                hintText: '••••',
                hintStyle: TextStyle(fontSize: 28, color: GetGasColors.textMuted.withValues(alpha: 0.4), letterSpacing: 12),
                filled: true,
                fillColor: GetGasColors.bgCard2,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: GetGasColors.brand,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Confirm', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    final otp = ctrl.text.trim();
    if (otp.length != 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 4-digit OTP')),
      );
      return;
    }

    final isOnline = ref.read(isOnlineProvider);
    setState(() => _loading = true);
    try {
      if (!isOnline) {
        final type = order.status == 'accepted'
            ? MutationType.orderAtStation
            : MutationType.orderDelivered;
        await MutationQueueService.enqueue(QueuedMutation(
          type: type,
          payload: {'orderId': order.id, 'otp': otp},
          queuedAt: DateTime.now(),
        ));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Queued — will sync when back online')),
          );
        }
        return;
      }
      await ref.read(ridersApiProvider).confirmOtp(order.id, otp);
      ref.invalidate(_orderProvider(widget.orderId));
      if (mounted) {
        final msg = isCash ? 'Pickup confirmed! Head to the station 🏍️' : 'Delivery confirmed! 🎉';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
        if (!isCash) context.go('/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_orderProvider(widget.orderId));

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: orderAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (error, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(20)),
                  child: const Icon(Icons.wifi_off_rounded, size: 30, color: GetGasColors.textMuted),
                ),
                const SizedBox(height: 16),
                Text(
                  error is ApiException ? error.message : 'Could not load order',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () => ref.invalidate(_orderProvider(widget.orderId)),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GetGasColors.brand,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ),
        data: (order) {
          final riderId = ref.watch(riderProfileProvider).valueOrNull?.id ?? '';
          return Column(
          children: [
            _OrderHeader(order: order),
            Expanded(
              child: RefreshIndicator(
                color: GetGasColors.brand,
                onRefresh: () async => ref.invalidate(_orderProvider(widget.orderId)),
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  children: [
                    // Map + Navigate button
                    if (_navDest(order) != null) ...[
                      NavMap(
                        destination: LatLng(
                          _navDest(order)!.lat,
                          _navDest(order)!.lng,
                        ),
                        destinationLabel: _navDest(order)!.label,
                        orderId: widget.orderId,
                        riderId: riderId,
                        instructionLabel: order.status == 'accepted'
                            ? 'Head to Customer'
                            : 'Return to Customer',
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () => context.push('/navigate/${widget.orderId}'),
                          icon: const Icon(Icons.navigation_rounded, size: 16),
                          label: const Text('Full-Screen Navigation'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: GetGasColors.brand,
                            side: const BorderSide(color: GetGasColors.brand),
                            minimumSize: const Size(0, 44),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            textStyle: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ] else
                      const SizedBox.shrink(),

                    // Current action
                    if (_statusActions.containsKey(order.status)) ...[
                      _ActionCard(
                        order: order,
                        loading: _loading,
                        onAction: () => _updateStatus(order),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Order details
                    _SectionCard(
                      label: 'Order Details',
                      child: _OrderDetails(order: order),
                    ),
                    const SizedBox(height: 12),

                    // Station
                    if (order.station != null) ...[
                      _SectionCard(
                        label: 'Refill Station',
                        child: _StationRow(station: order.station!),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Customer delivery address
                    if (order.deliveryAddress != null) ...[
                      _SectionCard(
                        label: 'Delivery Address',
                        child: Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 16, color: GetGasColors.brand),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${order.deliveryAddress!.street}'
                                '${order.deliveryAddress!.city.isNotEmpty ? ', ${order.deliveryAddress!.city}' : ''}',
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
}

// ── Nav destination helper ────────────────────────────────────────────────────

({double lat, double lng, String label})? _navDest(GasOrder order) {
  final addr = order.deliveryAddress;
  if (order.status == 'accepted' && addr != null) {
    return (lat: addr.lat, lng: addr.lng, label: 'Customer — Pickup');
  }
  if (order.status == 'en_route' && addr != null) {
    return (lat: addr.lat, lng: addr.lng, label: 'Customer — Delivery');
  }
  // at_station — we don't have station coords in the model yet, skip map
  return null;
}

// ── Header ────────────────────────────────────────────────────────────────────

class _OrderHeader extends StatelessWidget {
  const _OrderHeader({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    final stepIdx = _statusIndex[order.status] ?? 0;

    return Container(
      color: GetGasColors.brand,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: () => context.canPop() ? context.pop() : context.go('/orders'),
                    child: Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.arrow_back, size: 18, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order #${order.displayNumber}',
                            style: TextStyle(fontSize: 11,
                                color: Colors.white.withValues(alpha: 0.7))),
                        const Text('Active Delivery',
                            style: TextStyle(fontSize: 16,
                                fontWeight: FontWeight.w800, color: Colors.white)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'GHS ${(order.deliveryFee ?? 0).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 18,
                            fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      Text('Your Earning',
                          style: TextStyle(fontSize: 10,
                              color: Colors.white.withValues(alpha: 0.7))),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Progress steps
              Row(
                children: List.generate(_steps.length, (i) {
                  final done   = i < stepIdx;
                  final active = i == stepIdx;
                  final isLast = i == _steps.length - 1;
                  return Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 36, height: 36,
                                decoration: BoxDecoration(
                                  color: done
                                      ? const Color(0xFF4ADE80)
                                      : active
                                          ? Colors.white
                                          : Colors.white.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: done
                                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                                    : Icon(_steps[i].icon, size: 16,
                                        color: active
                                            ? GetGasColors.brand
                                            : Colors.white.withValues(alpha: 0.4)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _steps[i].label,
                                style: TextStyle(
                                  fontSize: 8, fontWeight: FontWeight.w600,
                                  color: done
                                      ? const Color(0xFF4ADE80)
                                      : active
                                          ? Colors.white
                                          : Colors.white.withValues(alpha: 0.4),
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 2,
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
                                  ? const Color(0xFF4ADE80)
                                  : Colors.white.withValues(alpha: 0.2),
                            ),
                          ),
                      ],
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Action card ─────────────────────────────────────────────────────────────

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.order,
    required this.loading,
    required this.onAction,
  });

  final GasOrder order;
  final bool loading;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final action = _statusActions[order.status]!;
    final stepIdx = _statusIndex[order.status] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('CURRENT STEP',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                  color: GetGasColors.brand, letterSpacing: 0.8)),
          const SizedBox(height: 4),
          Text(_steps[stepIdx].label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: loading ? null : onAction,
            icon: loading
                ? const SizedBox(width: 16, height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_outline, size: 18),
            label: Text(action.label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: GetGasColors.brand,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Order details ─────────────────────────────────────────────────────────────

class _OrderDetails extends StatelessWidget {
  const _OrderDetails({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...order.cylinders.map((c) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.local_fire_department_rounded,
                    size: 16, color: GetGasColors.brand),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text('${c.size}kg × ${c.quantity}',
                  style: const TextStyle(fontSize: 13))),
              Text('GHS ${c.subtotal.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ],
          ),
        )),
        const Divider(color: GetGasColors.border, height: 16),
        _Row('Delivery Fee',
            'GHS ${(order.deliveryFee ?? 0).toStringAsFixed(2)}'),
        _Row('Total', 'GHS ${order.displayTotal.toStringAsFixed(2)}',
            bold: true, valueColor: GetGasColors.brand),
        _Row('Payment',
            _paymentLabels[order.paymentMethod] ?? (order.paymentMethod ?? '—')),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.bold = false, this.valueColor});
  final String label, value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
          Text(value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: valueColor,
              )),
        ],
      ),
    );
  }
}

// ── Station row ───────────────────────────────────────────────────────────────

class _StationRow extends StatelessWidget {
  const _StationRow({required this.station});
  final OrderStation station;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.store_outlined,
              size: 20, color: Colors.orange),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(station.name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              if (station.address.isNotEmpty)
                Text(station.address,
                    style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Section card ──────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(label.toUpperCase(),
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                  color: GetGasColors.textMuted, letterSpacing: 0.8)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _orderProvider = FutureProvider.family<GasOrder, String>((ref, id) async {
  try {
    final order = await ref.read(ordersApiProvider).getById(id);
    await CacheService.saveOrder(id, order.toJson());
    return order;
  } catch (e) {
    // Network failed — try cache as fallback
    final cached = await CacheService.loadOrder(id);
    if (cached != null) return GasOrder.fromJson(cached);
    rethrow;
  }
});
