import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../providers/connectivity_provider.dart';
import '../providers/home_providers.dart';
import '../services/background_location_service.dart';
import '../services/cache_service.dart';
import '../services/mutation_queue_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _togglingStatus = false;

  Future<void> _toggleStatus(Rider rider) async {
    final goingOnline = !rider.isOnline;
    final next = goingOnline ? 'available' : 'offline';
    final isOnline = ref.read(isOnlineProvider);

    setState(() => _togglingStatus = true);
    try {
      if (!isOnline) {
        await MutationQueueService.enqueue(QueuedMutation(
          type: MutationType.setStatus,
          payload: {'status': next},
          queuedAt: DateTime.now(),
        ));
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(
              goingOnline ? 'You\'re offline — will go online when reconnected' : 'You\'re offline — will go offline when reconnected',
            )),
          );
        }
        return;
      }
      await ref.read(ridersApiProvider).setStatus(next);
      if (goingOnline) {
        BackgroundLocationService.start();
      } else {
        BackgroundLocationService.stop();
      }
      ref.invalidate(riderProfileProvider);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not update status')),
        );
      }
    } finally {
      if (mounted) setState(() => _togglingStatus = false);
    }
  }

  Future<void> _refresh() async {
    ref.invalidate(riderProfileProvider);
    ref.invalidate(riderDashboardProvider);
    ref.invalidate(activeOrdersProvider);
    ref.invalidate(_recentOrdersProvider);
  }

  @override
  Widget build(BuildContext context) {
    final riderAsync  = ref.watch(riderProfileProvider);
    final dashAsync   = ref.watch(riderDashboardProvider);
    final activeAsync = ref.watch(activeOrdersProvider);

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: riderAsync.when(
        loading: () => const Scaffold(
          backgroundColor: GetGasColors.bg,
          body: Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        ),
        error: (_, __) => Scaffold(
          backgroundColor: GetGasColors.bg,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: GetGasColors.bgCard2,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.wifi_off_rounded, size: 36, color: GetGasColors.textMuted),
                  ),
                  const SizedBox(height: 20),
                  const Text('Could not connect', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  const Text(
                    'Check your internet connection and try again.',
                    style: TextStyle(fontSize: 14, color: GetGasColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  ElevatedButton.icon(
                    onPressed: () => ref.invalidate(riderProfileProvider),
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Try Again'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: GetGasColors.brand,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(200, 50),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        data: (rider) => Column(
          children: [
            _HomeHeader(
              rider: rider,
              toggling: _togglingStatus,
              onToggle: () => _toggleStatus(rider),
            ),
            Expanded(
              child: RefreshIndicator(
                color: GetGasColors.brand,
                onRefresh: _refresh,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                  children: [
                    dashAsync.when(
                      loading: () => const _StatsSkeletons(),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (dash) => _StatsSection(dash: dash),
                    ),
                    const SizedBox(height: 4),
                    activeAsync.when(
                      loading: () => const _ActiveOrdersSkeleton(),
                      error: (_, __) => const SizedBox.shrink(),
                      data: (orders) => orders.isEmpty
                          ? const SizedBox.shrink()
                          : _ActiveOrdersSection(
                              orders: orders,
                              onTap: (id) => context.push('/orders/$id'),
                            ),
                    ),
                    const SizedBox(height: 16),
                    _RecentDeliveriesSection(onTap: (id) => context.push('/orders/$id')),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.rider, required this.toggling, required this.onToggle});

  final Rider rider;
  final bool toggling;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final isOnline = rider.isOnline;

    return Container(
      color: isOnline ? GetGasColors.brand : const Color(0xFF1F2937),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Welcome back',
                            style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                        Text(rider.name,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: toggling ? null : onToggle,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isOnline ? Colors.white.withValues(alpha: 0.2) : const Color(0xFF22C55E),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (toggling)
                            const SizedBox(
                              width: 14, height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          else
                            const Icon(Icons.power_settings_new, size: 14, color: Colors.white),
                          const SizedBox(width: 6),
                          Text(
                            isOnline ? 'Go Offline' : 'Go Online',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerLeft,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8, height: 8,
                        decoration: BoxDecoration(
                          color: isOnline ? const Color(0xFF4ADE80) : GetGasColors.textMuted,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        rider.status == 'busy' ? 'On Delivery' : isOnline ? 'Available for Orders' : 'Offline',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Active orders ─────────────────────────────────────────────────────────────

class _ActiveOrdersSkeleton extends StatelessWidget {
  const _ActiveOrdersSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(width: 120, height: 12,
            decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(6))),
        const SizedBox(height: 10),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: 2,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, __) => Container(
              width: 200,
              decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ActiveOrdersSection extends StatelessWidget {
  const _ActiveOrdersSection({required this.orders, required this.onTap});
  final List<GasOrder> orders;
  final ValueChanged<String> onTap;

  static const _statusColors = {
    'accepted':   Color(0xFF3B82F6),
    'at_station': Color(0xFF8B5CF6),
    'en_route':   GetGasColors.brand,
  };
  static const _statusLabels = {
    'accepted':   'Accepted',
    'at_station': 'At Station',
    'en_route':   'En Route',
  };

  @override
  Widget build(BuildContext context) {
    final single = orders.length == 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Active Orders (${orders.length})',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                color: GetGasColors.textMuted, letterSpacing: 0.8)),
        const SizedBox(height: 10),
        if (single)
          _ActiveOrderCard(
            order: orders.first,
            onTap: () => onTap(orders.first.id),
            color: _statusColors[orders.first.status] ?? GetGasColors.brand,
            label: _statusLabels[orders.first.status] ?? orders.first.status,
          )
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: List.generate(orders.length, (i) => Padding(
                padding: EdgeInsets.only(right: i < orders.length - 1 ? 12 : 0),
                child: _ActiveOrderCard(
                  order: orders[i],
                  onTap: () => onTap(orders[i].id),
                  color: _statusColors[orders[i].status] ?? GetGasColors.brand,
                  label: _statusLabels[orders[i].status] ?? orders[i].status,
                  width: 256,
                ),
              )),
            ),
          ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ActiveOrderCard extends StatelessWidget {
  const _ActiveOrderCard({
    required this.order, required this.onTap,
    required this.color, required this.label, this.width,
  });

  final GasOrder order;
  final VoidCallback onTap;
  final Color color;
  final String label;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFFCC80), width: 2),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFFFE0B2), borderRadius: BorderRadius.circular(999)),
                  child: Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFFB04D08))),
                ),
                Text('#${order.displayNumber}',
                    style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted, fontWeight: FontWeight.w500)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${order.cylinders.map((c) => '${c.size}kg×${c.quantity}').join(', ')} · ${order.orderType ?? ''}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GetGasColors.text),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 12, color: GetGasColors.textMuted),
                const SizedBox(width: 2),
                Expanded(
                  child: Text(
                    '${order.deliveryAddress?.street ?? '—'}, ${order.deliveryAddress?.city ?? ''}',
                    style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text('Tap to view →',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.brand)),
          ],
        ),
      ),
    );
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

class _StatsSection extends StatelessWidget {
  const _StatsSection({required this.dash});
  final RiderDashboard dash;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _StatCard(label: "Today's Earnings", value: 'GHS ${dash.todayEarnings.toStringAsFixed(2)}', valueColor: const Color(0xFF16A34A)),
            const SizedBox(width: 12),
            _StatCard(label: "Today's Trips", value: '${dash.todayTrips}'),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, this.valueColor});
  final String label, value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: GetGasColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: valueColor ?? GetGasColors.text)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _StatsSkeletons extends StatelessWidget {
  const _StatsSkeletons();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(children: [Expanded(child: _SkeletonBox(height: 72)), const SizedBox(width: 12), Expanded(child: _SkeletonBox(height: 72))]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _SkeletonBox(height: 72)), const SizedBox(width: 12),
          Expanded(child: _SkeletonBox(height: 72)), const SizedBox(width: 12),
          Expanded(child: _SkeletonBox(height: 72)),
        ]),
      ],
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  const _SkeletonBox({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(16)),
    );
  }
}

// ── Recent deliveries ─────────────────────────────────────────────────────────

class _RecentDeliveriesSection extends ConsumerWidget {
  const _RecentDeliveriesSection({required this.onTap});
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_recentOrdersProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Recent Deliveries',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: GetGasColors.text)),
        const SizedBox(height: 10),
        ordersAsync.when(
          loading: () => Column(
            children: List.generate(3, (_) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _SkeletonBox(height: 64),
            )),
          ),
          error: (_, __) => const SizedBox.shrink(),
          data: (orders) {
            if (orders.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: Text('No recent deliveries',
                    style: TextStyle(color: GetGasColors.textMuted, fontSize: 13))),
              );
            }
            return Column(
              children: orders.map((order) {
                final date = DateTime.tryParse(order.createdAt ?? '');
                final timeLabel = date != null ? _timeAgo(date) : '';
                return GestureDetector(
                  onTap: () => onTap(order.id),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: GetGasColors.bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: GetGasColors.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${order.cylinders.map((c) => '${c.size}kg×${c.quantity}').join(', ')} · ${order.orderType ?? ''}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                              ),
                              Text(timeLabel, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('+GHS ${(order.deliveryFee ?? 0).toStringAsFixed(2)}',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF16A34A))),
                            Text(_statusLabel(order.status),
                                style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                          ],
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right, size: 16, color: GetGasColors.textMuted),
                      ],
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }

  String _statusLabel(String s) => const {
    'pending': 'Pending', 'accepted': 'Accepted', 'at_station': 'At Station',
    'en_route': 'En Route', 'delivered': 'Delivered', 'cancelled': 'Cancelled',
  }[s] ?? s;

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

final _recentOrdersProvider = FutureProvider.autoDispose<List<GasOrder>>((ref) async {
  final cached = await CacheService.loadOrders('recent');
  if (cached != null) {
    ref.watch(ordersApiProvider).list(limit: 5).then((fresh) {
      CacheService.saveOrders('recent', fresh.map((o) => o.toJson()).toList());
      ref.invalidateSelf();
    }).catchError((_) {});
    // Drop cache entries with bad ids — tapping them can't load details.
    return cached.map(GasOrder.fromJson).where((o) => o.hasValidId).toList();
  }
  final orders = await ref.watch(ordersApiProvider).list(limit: 5);
  await CacheService.saveOrders('recent', orders.map((o) => o.toJson()).toList());
  return orders;
});
