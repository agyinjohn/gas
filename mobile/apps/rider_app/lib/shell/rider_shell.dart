import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../providers/auth_provider.dart';
import '../providers/connectivity_provider.dart';
import '../providers/home_providers.dart';
import '../providers/realtime_provider.dart';
import '../services/background_location_service.dart';
import '../services/mutation_queue_service.dart';

class RiderShell extends ConsumerStatefulWidget {
  const RiderShell({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<RiderShell> createState() => _RiderShellState();
}

class _RiderShellState extends ConsumerState<RiderShell> {
  Timer? _countdownTimer;
  bool _wasOffline = false;

  @override
  void initState() {
    super.initState();
    _initSocket();
    _countdownTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => ref.read(incomingOrderProvider.notifier).tick(),
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _initSocket() async {
    final rider = await ref.read(riderProfileProvider.future);
    final realtime = ref.read(riderRealtimeProvider);
    await realtime.joinRiderRoom(rider.id);
    realtime.onNewOrder((order) {
      ref.read(incomingOrderProvider.notifier).incoming(order);
    });

    final config = ref.read(appConfigProvider);
    final token = await ref.read(authRepositoryProvider).currentToken() ?? '';
    await BackgroundLocationService.saveForBackground(
      token: token,
      riderId: rider.id,
      socketUrl: config.socketUrl,
    );
    if (rider.isOnline) BackgroundLocationService.start();
  }

  Future<void> _acceptOrder(String orderId) async {
    final isOnline = ref.read(isOnlineProvider);
    if (!isOnline) {
      await MutationQueueService.enqueue(QueuedMutation(
        type: MutationType.acceptOrder,
        payload: {'orderId': orderId},
        queuedAt: DateTime.now(),
      ));
      ref.read(incomingOrderProvider.notifier).dismiss();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Queued — order will be accepted when reconnected')),
        );
      }
      return;
    }
    try {
      await ref.read(ridersApiProvider).acceptOrder(orderId);
      ref.read(incomingOrderProvider.notifier).dismiss();
      ref.invalidate(activeOrdersProvider);
      ref.invalidate(riderDashboardProvider);
      if (mounted) context.push('/orders/$orderId');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to accept order')),
        );
      }
    }
  }


  static int _tabIndex(String location) {
    if (location.startsWith('/orders')) return 1;
    if (location.startsWith('/earnings')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  static bool _hideNav(String location) =>
      RegExp(r'^/orders/[^/]+').hasMatch(location);

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final incoming = ref.watch(incomingOrderProvider);
    final isOnline = ref.watch(isOnlineProvider);

    // When back online after being offline — replay queue then refresh providers
    ref.listen<bool>(isOnlineProvider, (prev, next) {
      if (next && _wasOffline) {
        MutationQueueService.replay(ref).then((_) {
          ref.invalidate(riderProfileProvider);
          ref.invalidate(riderDashboardProvider);
          ref.invalidate(activeOrdersProvider);
        });
      }
      _wasOffline = !next;
    });

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          widget.child,

          // ── Offline banner ─────────────────────────────────────────────
          if (!isOnline)
            const Positioned(
              bottom: 0, left: 0, right: 0,
              child: _OfflineBanner(),
            ),


          // ── Global incoming order overlay ──────────────────────────────
          if (incoming.hasOrder)
            _IncomingOrderOverlay(
              incoming: incoming,
              onAccept: () => _acceptOrder(incoming.order!.orderId),
              onDecline: () => ref.read(incomingOrderProvider.notifier).dismiss(),
            ),

        ],
      ),
      bottomNavigationBar: !_hideNav(location)
          ? _RiderBottomNav(currentIndex: _tabIndex(location))
          : null,
    );
  }
}

// ── Offline banner ───────────────────────────────────────────────────────────

class _OfflineBanner extends ConsumerStatefulWidget {
  const _OfflineBanner();

  @override
  ConsumerState<_OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends ConsumerState<_OfflineBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 300));
    _slide = Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pending = ref.watch(pendingMutationsProvider).valueOrNull ?? 0;
    return SlideTransition(
      position: _slide,
      child: Material(
        color: Colors.transparent,
        child: SafeArea(
          top: false,
          child: Container(
            width: double.infinity,
            color: const Color(0xFF1F2937),
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 14, color: Colors.white70),
                const SizedBox(width: 8),
                Text(
                  pending > 0
                      ? 'Offline — $pending action${pending == 1 ? '' : 's'} queued'
                      : 'You\'re offline — showing cached data',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Incoming order overlay ────────────────────────────────────────────────────

class _IncomingOrderOverlay extends StatefulWidget {
  const _IncomingOrderOverlay({
    required this.incoming,
    required this.onAccept,
    required this.onDecline,
  });

  final IncomingOrderState incoming;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  State<_IncomingOrderOverlay> createState() => _IncomingOrderOverlayState();
}

class _IncomingOrderOverlayState extends State<_IncomingOrderOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slide;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 350));
    _slide = Tween<Offset>(begin: const Offset(0, -1), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _fade = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.incoming.order!;
    final countdown = widget.incoming.countdown;
    final urgent = countdown <= 30;

    return Positioned.fill(
      child: Material(
        color: Colors.black.withValues(alpha: 0.55),
        child: FadeTransition(
          opacity: _fade,
          child: SafeArea(
            child: Align(
              alignment: Alignment.topCenter,
              child: SlideTransition(
                position: _slide,
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  decoration: BoxDecoration(
                    color: GetGasColors.bgCard,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: GetGasColors.brand, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: GetGasColors.brand.withValues(alpha: 0.25),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // ── Top bar ──
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: const BoxDecoration(
                          color: GetGasColors.brand,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.notifications_active, size: 18, color: Colors.white),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text('New Delivery Order!',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                            ),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: urgent ? Colors.red : Colors.white.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${countdown}s',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // ── Body ──
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                _InfoTile(label: 'Cylinders', value: order.cylinders),
                                const SizedBox(width: 12),
                                _InfoTile(
                                  label: 'Your Earning',
                                  value: 'GHS ${order.earning.toStringAsFixed(2)}',
                                  valueColor: const Color(0xFF16A34A),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 14, color: GetGasColors.textMuted),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '${order.deliveryStreet}, ${order.deliveryCity}',
                                    style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: widget.onDecline,
                                    style: OutlinedButton.styleFrom(
                                      minimumSize: const Size(0, 48),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: const Text('Decline', style: TextStyle(fontWeight: FontWeight.w700)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: widget.onAccept,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: GetGasColors.brand,
                                      foregroundColor: Colors.white,
                                      minimumSize: const Size(0, 48),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: const Text('Accept', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value, this.valueColor});
  final String label, value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard2,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: valueColor ?? GetGasColors.text)),
          ],
        ),
      ),
    );
  }
}

// ── Bottom nav ────────────────────────────────────────────────────────────────

class _RiderBottomNav extends StatelessWidget {
  const _RiderBottomNav({required this.currentIndex});
  final int currentIndex;

  static const _tabs = [
    (icon: Icons.home_outlined,                   activeIcon: Icons.home_rounded,                  label: 'Home'),
    (icon: Icons.receipt_long_outlined,            activeIcon: Icons.receipt_long_rounded,           label: 'Orders'),
    (icon: Icons.account_balance_wallet_outlined,  activeIcon: Icons.account_balance_wallet_rounded, label: 'Earnings'),
    (icon: Icons.person_outline,                   activeIcon: Icons.person_rounded,                 label: 'Profile'),
  ];

  void _onTap(BuildContext context, int i) {
    switch (i) {
      case 0: context.go('/');
      case 1: context.go('/orders');
      case 2: context.go('/earnings');
      case 3: context.go('/profile');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        border: const Border(top: BorderSide(color: GetGasColors.border)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: List.generate(_tabs.length, (i) {
              final tab = _tabs[i];
              final active = i == currentIndex;
              return Expanded(
                child: GestureDetector(
                  onTap: () => _onTap(context, i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? GetGasColors.brand.withValues(alpha: 0.10) : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: Icon(
                            active ? tab.activeIcon : tab.icon,
                            key: ValueKey(active),
                            size: 22,
                            color: active ? GetGasColors.brand : GetGasColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tab.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                            color: active ? GetGasColors.brand : GetGasColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
