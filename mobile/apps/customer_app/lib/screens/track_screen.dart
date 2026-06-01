import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';

/// Track tab — mirrors web `/user/track` (auto-redirect when active order exists).
class TrackScreen extends ConsumerStatefulWidget {
  const TrackScreen({super.key});

  @override
  ConsumerState<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends ConsumerState<TrackScreen> {
  @override
  Widget build(BuildContext context) {
    final ordersAsync = ref.watch(_trackOrdersProvider);

    return ordersAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
      ),
      error: (_, __) => const Scaffold(body: Center(child: Text('Could not load'))),
      data: (active) {
        if (active != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) context.go('/track/${active.id}');
          });
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
          );
        }

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
                'Track Order',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ),
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: GetGasColors.brand.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: const Icon(Icons.location_on, size: 40, color: GetGasColors.brand),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'No active delivery',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'When you place an order, you can track your rider here in real time.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: GetGasColors.textMuted),
                      ),
                      const SizedBox(height: 24),
                      OutlinedButton(
                        onPressed: () => context.go('/'),
                        child: const Text('Browse Stations'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

final _trackOrdersProvider = FutureProvider<GasOrder?>((ref) async {
  const active = ['pending', 'accepted', 'at_station', 'en_route'];
  final orders = await ref.watch(ordersApiProvider).list();
  for (final o in orders) {
    if (active.contains(o.status)) return o;
  }
  return null;
});
