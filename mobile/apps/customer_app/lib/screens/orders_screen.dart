import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';

/// Orders tab — mirrors web `/user/orders` mobile layout (simplified active/past).
class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_ordersListProvider);

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 48, 16, 16),
          decoration: const BoxDecoration(
            color: GetGasColors.bgCard,
            border: Border(bottom: BorderSide(color: GetGasColors.border)),
          ),
          child: const Text(
            'Orders',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: GetGasColors.text),
          ),
        ),
        Expanded(
          child: ordersAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
            error: (_, __) => const Center(child: Text('Could not load orders')),
            data: (orders) {
              if (orders.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 48, color: GetGasColors.textMuted),
                      SizedBox(height: 12),
                      Text('No orders yet', style: TextStyle(color: GetGasColors.textMuted)),
                    ],
                  ),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                itemCount: orders.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, i) {
                  final o = orders[i];
                  final idSuffix = o.id.length >= 8
                      ? o.id.substring(o.id.length - 8).toUpperCase()
                      : o.id.toUpperCase();
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
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Order #$idSuffix',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: GetGasColors.text,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    homeOrderStatusLabel(o.status),
                                    style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            if (o.totalAmount != null)
                              Text(
                                'GHS ${o.totalAmount}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  color: GetGasColors.brand,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

final _ordersListProvider = FutureProvider((ref) {
  return ref.watch(ordersApiProvider).list();
});
