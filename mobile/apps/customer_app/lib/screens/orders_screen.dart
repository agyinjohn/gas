import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  static const _activeStatuses = {
    'awaiting_payment', 'pending', 'accepted', 'at_station', 'en_route',
  };

  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(_ordersListProvider);

    return Column(
      children: [
        // ── Header ──
        Container(
          decoration: const BoxDecoration(
            color: GetGasColors.bgCard,
            border: Border(bottom: BorderSide(color: GetGasColors.border)),
          ),
          child: SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 12),
                  child: Text(
                    'My Orders',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: GetGasColors.text),
                  ),
                ),
                TabBar(
                  controller: _tab,
                  labelColor: GetGasColors.brand,
                  unselectedLabelColor: GetGasColors.textMuted,
                  labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  unselectedLabelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  indicatorColor: GetGasColors.brand,
                  indicatorWeight: 2.5,
                  tabs: const [
                    Tab(text: 'Active'),
                    Tab(text: 'Past'),
                  ],
                ),
              ],
            ),
          ),
        ),

        // ── Body ──
        Expanded(
          child: ordersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
            error: (_, __) => const Center(child: Text('Could not load orders')),
            data: (orders) {
              final active = orders.where((o) => _activeStatuses.contains(o.status)).toList();
              final past   = orders.where((o) => !_activeStatuses.contains(o.status)).toList();

              return TabBarView(
                controller: _tab,
                children: [
                  _OrderList(orders: active, emptyLabel: 'No active orders', emptyIcon: Icons.local_shipping_outlined),
                  _OrderList(orders: past,   emptyLabel: 'No past orders',   emptyIcon: Icons.receipt_long_outlined),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _OrderList extends StatelessWidget {
  const _OrderList({required this.orders, required this.emptyLabel, required this.emptyIcon});

  final List<GasOrder> orders;
  final String emptyLabel;
  final IconData emptyIcon;

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: GetGasColors.brand.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(emptyIcon, size: 30, color: GetGasColors.brand.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 14),
            Text(emptyLabel, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 4),
            const Text('Your orders will appear here', style: TextStyle(fontSize: 13, color: GetGasColors.textMuted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: GetGasColors.brand,
      onRefresh: () async {},
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _OrderCard(order: orders[i]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    final idSuffix = order.id.length >= 8
        ? order.id.substring(order.id.length - 8).toUpperCase()
        : order.id.toUpperCase();

    final isAwaiting = order.status == 'awaiting_payment';
    final isCancelled = order.status == 'cancelled';

    final (statusLabel, statusColor, statusBg) = switch (order.status) {
      'awaiting_payment' => ('Awaiting Payment', const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
      'pending'          => ('Order Placed',      const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
      'accepted'         => ('Rider Assigned',    const Color(0xFF3B82F6), const Color(0xFFEFF6FF)),
      'at_station'       => ('At Station',        const Color(0xFF8B5CF6), const Color(0xFFF5F3FF)),
      'en_route'         => ('On the Way',        GetGasColors.brand,      GetGasColors.brand.withValues(alpha: 0.08)),
      'delivered'        => ('Delivered',         const Color(0xFF16A34A), const Color(0xFFDCFCE7)),
      'cancelled'        => ('Cancelled',         GetGasColors.error,      GetGasColors.errorBg),
      _                  => (orderStatusLabel(order.status), GetGasColors.textMuted, GetGasColors.bgCard2),
    };

    final date = order.createdAt != null
        ? _formatDate(order.createdAt!)
        : '';

    final summary = order.cylinders.isNotEmpty
        ? order.cylinders.map((c) => '${c.size}kg ×${c.quantity}').join(', ')
        : 'Gas order';

    return Material(
      color: GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => context.push('/orders/${order.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isAwaiting
                  ? const Color(0xFFF59E0B).withValues(alpha: 0.4)
                  : GetGasColors.border,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Top row ──
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                child: Row(
                  children: [
                    // Icon
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isCancelled
                            ? GetGasColors.bgCard2
                            : GetGasColors.brand.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        isCancelled ? Icons.cancel_outlined : Icons.local_fire_department_rounded,
                        size: 20,
                        color: isCancelled ? GetGasColors.textMuted : GetGasColors.brand,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Order number + date
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order #$idSuffix',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: GetGasColors.text),
                          ),
                          if (date.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(date, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                          ],
                        ],
                      ),
                    ),
                    // Amount
                    if (order.totalAmount != null)
                      Text(
                        'GHS ${order.totalAmount!.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: isCancelled ? GetGasColors.textMuted : GetGasColors.brand,
                        ),
                      ),
                  ],
                ),
              ),

              // ── Divider ──
              const Divider(height: 1, color: GetGasColors.border),

              // ── Bottom row: summary + status ──
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        summary,
                        style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Awaiting payment callout ──
              if (isAwaiting)
                Container(
                  margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, size: 14, color: Color(0xFFF59E0B)),
                      SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Payment not completed — tap to pay',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return '';
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]}, $h:$m';
  }
}

final _ordersListProvider = FutureProvider((ref) {
  return ref.watch(ordersApiProvider).list();
});
