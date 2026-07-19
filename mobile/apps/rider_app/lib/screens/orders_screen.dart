import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../services/cache_service.dart';

// ── Filters ───────────────────────────────────────────────────────────────────

const _filters = [
  (key: '',                             label: 'All'),
  (key: 'accepted,at_station,en_route', label: 'Active'),
  (key: 'delivered',                    label: 'Completed'),
  (key: 'cancelled',                    label: 'Cancelled'),
];

const _statusColors = {
  'accepted':   Color(0xFF3B82F6),
  'at_station': Color(0xFF8B5CF6),
  'en_route':   GetGasColors.brand,
  'delivered':  Color(0xFF16A34A),
  'cancelled':  GetGasColors.error,
};

const _statusLabels = {
  'accepted':   'Accepted',
  'at_station': 'At Station',
  'en_route':   'En Route',
  'delivered':  'Delivered',
  'cancelled':  'Cancelled',
};

// ── Screen ────────────────────────────────────────────────────────────────────

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String _filter = '';
  List<GasOrder> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetch());
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final orders = await ref.read(ridersApiProvider).getOrders(
        status: _filter.isNotEmpty ? _filter : null,
        limit: 30,
      );
      await CacheService.saveOrders(_filter, orders.map((o) => o.toJson()).toList());
      if (mounted) setState(() { _orders = orders; _loading = false; });
    } catch (e, st) {
      debugPrint('[OrdersScreen] fetch error: $e');
      debugPrint('[OrdersScreen] $st');
      final cached = await CacheService.loadOrders(_filter);
      if (mounted) {
        if (cached != null) {
          setState(() {
            _orders = cached.map(GasOrder.fromJson).where((o) => o.hasValidId).toList();
            _loading = false;
          });
        } else {
          setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
        }
      }
    }
  }

  void _onFilterChange(String filter) {
    setState(() { _filter = filter; _orders = []; });
    _fetch();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: Column(
        children: [
          // ── Header ──
          Container(
            color: GetGasColors.bgCard,
            child: SafeArea(
              bottom: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
                    child: Text('My Deliveries',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900,
                            color: GetGasColors.text)),
                  ),
                  SizedBox(
                    height: 36,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      scrollDirection: Axis.horizontal,
                      itemCount: _filters.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, i) {
                        final f = _filters[i];
                        final active = _filter == f.key;
                        return GestureDetector(
                          onTap: () => _onFilterChange(f.key),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              color: active ? GetGasColors.brand : GetGasColors.bgCard2,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: active ? GetGasColors.brand : GetGasColors.border,
                              ),
                            ),
                            child: Text(
                              f.label,
                              style: TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600,
                                color: active ? Colors.white : GetGasColors.textMuted,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: GetGasColors.border),
                ],
              ),
            ),
          ),

          // ── Body ──
          Expanded(
            child: _loading
                ? _OrderSkeletons()
                : _error != null
                    ? _ErrorView(message: _error!, onRetry: _fetch)
                    : _orders.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.two_wheeler_outlined,
                                    size: 48, color: GetGasColors.textMuted),
                                const SizedBox(height: 12),
                                const Text('No deliveries found',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Text(
                                  _filter.isNotEmpty
                                      ? 'Try a different filter'
                                      : 'Go online to start receiving orders',
                                  style: const TextStyle(
                                      fontSize: 13, color: GetGasColors.textMuted),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            color: GetGasColors.brand,
                            onRefresh: _fetch,
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                              itemCount: _orders.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, i) => _OrderCard(
                                order: _orders[i],
                                onTap: () => context.push('/orders/${_orders[i].id}'),
                              ),
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

// ── Order card ────────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, required this.onTap});
  final GasOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = _statusColors[order.status] ?? GetGasColors.textMuted;
    final label = _statusLabels[order.status] ?? order.status;
    final addr  = order.deliveryAddress;
    final date  = DateTime.tryParse(order.createdAt ?? '');
    final timeLabel = date != null ? _timeAgo(date) : '';
    final cylinders = order.cylinders.map((c) => '${c.size}kg×${c.quantity}').join(', ');

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: GetGasColors.border),
        ),
        child: Column(
          children: [
            // Top row
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: GetGasColors.brand.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.two_wheeler_rounded,
                      size: 20, color: GetGasColors.brand),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('#${order.displayNumber}',
                          style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                      Text(cylinders,
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w700),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(label,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
                ),
              ],
            ),

            // Address
            if (addr != null && addr.street.isNotEmpty) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined,
                      size: 13, color: GetGasColors.textMuted),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${addr.street}${addr.city.isNotEmpty ? ', ${addr.city}' : ''}',
                      style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            // Bottom row
            const SizedBox(height: 10),
            const Divider(height: 1, color: GetGasColors.border),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.access_time_outlined,
                        size: 12, color: GetGasColors.textMuted),
                    const SizedBox(width: 4),
                    Text(timeLabel,
                        style: const TextStyle(
                            fontSize: 12, color: GetGasColors.textMuted)),
                  ],
                ),
                Row(
                  children: [
                    Text(
                      '+GHS ${(order.deliveryFee ?? 0).toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w800,
                          color: Color(0xFF16A34A)),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right,
                        size: 16, color: GetGasColors.textMuted),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

class _OrderSkeletons extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => Container(
        height: 110,
        decoration: BoxDecoration(
          color: GetGasColors.bgCard2,
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}

// ── Reusable error view ──────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: GetGasColors.bgCard2,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.wifi_off_rounded, size: 30, color: GetGasColors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(message,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
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
    );
  }
}

// ── Provider removed — state managed in _OrdersScreenState.initState ───────
