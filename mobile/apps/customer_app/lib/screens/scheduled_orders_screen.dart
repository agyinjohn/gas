import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../widgets/sub_page_scaffold.dart';

/// Scheduled orders — mirrors web `/user/scheduled`.
class ScheduledOrdersScreen extends ConsumerWidget {
  const ScheduledOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_scheduledOrdersProvider);

    return SubPageScaffold(
      title: 'Scheduled Orders',
      subtitle: 'Upcoming deliveries',
      child: ordersAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => const Center(child: Text('Could not load orders')),
        data: (orders) {
          if (orders.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 48, color: GetGasColors.textMuted.withValues(alpha: 0.5)),
                    const SizedBox(height: 12),
                    const Text('No scheduled orders', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    const Text('Schedule a delivery during checkout', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    PrimaryButton(label: 'Browse Stations', onPressed: () => context.go('/')),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final o = orders[i];
              final scheduled = o.scheduledFor;
              return Material(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  onTap: () => context.push('/orders/${o.id}'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: GetGasColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _cylinderSummary(o),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text('Scheduled', style: TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('#${o.displayNumber}', style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                        if (scheduled != null && scheduled.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.schedule, size: 14, color: GetGasColors.textMuted),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  _formatScheduled(scheduled),
                                  style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (o.deliveryAddress?.street.isNotEmpty == true) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined, size: 14, color: GetGasColors.textMuted),
                              const SizedBox(width: 6),
                              Expanded(child: Text(o.deliveryAddress!.street, style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis)),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text('GHS ${o.displayTotal}', style: const TextStyle(fontWeight: FontWeight.w900, color: GetGasColors.brand)),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _cylinderSummary(GasOrder order) {
    if (order.cylinders.isEmpty) return 'Order';
    return order.cylinders.map((c) => '${c.size}kg ×${c.quantity}').join(', ');
  }

  String _formatScheduled(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}

final _scheduledOrdersProvider = FutureProvider<List<GasOrder>>((ref) {
  return ref.watch(ordersApiProvider).list(status: 'scheduled', limit: 50);
});
