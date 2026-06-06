import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../widgets/complete_profile_sheet.dart';
import '../widgets/whatsapp_fab.dart';
import '../utils/profile_helpers.dart';
import '../providers/auth_provider.dart';
import '../providers/connectivity_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Shell with mobile bottom nav — mirrors web `user/layout.tsx`.
class UserShell extends ConsumerWidget {
  const UserShell({super.key, required this.child});

  final Widget child;

  static int tabIndex(String location) {
    if (location.startsWith('/orders')) return 1;
    if (location.startsWith('/track')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  static bool hideNav(String location) {
    return location.startsWith('/checkout') ||
        location.startsWith('/payment') ||
        location.startsWith('/order-success') ||
        location.startsWith('/notifications') ||
        location.startsWith('/loyalty') ||
        location.startsWith('/help') ||
        location.startsWith('/terms') ||
        location.startsWith('/privacy') ||
        location.startsWith('/scheduled') ||
        RegExp(r'^/orders/[^/]+').hasMatch(location) ||
        RegExp(r'^/track/[^/]+').hasMatch(location);
  }

  static bool showWhatsApp(String location) {
    return !location.startsWith('/checkout') &&
        !location.startsWith('/payment') &&
        !location.startsWith('/location');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.path;
    final showNav = !hideNav(location);
    final showFab = showWhatsApp(location);
    final user = ref.watch(authProvider).user;
    final isOnline = ref.watch(isOnlineProvider);
    final showCompleteProfile = user != null && userNeedsProfileCompletion(user);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        fit: StackFit.expand,
        children: [
          child,
          if (showFab) const WhatsAppFab(),
          if (showCompleteProfile) const CompleteProfileSheet(),
          if (!isOnline)
            const Positioned(
              bottom: 0, left: 0, right: 0,
              child: _OfflineBanner(),
            ),
        ],
      ),
      bottomNavigationBar: showNav
          ? UserBottomNav(
              currentIndex: tabIndex(location),
              onTap: (i) {
                switch (i) {
                  case 0:
                    context.go('/');
                  case 1:
                    context.go('/orders');
                  case 2:
                    context.go('/track');
                  case 3:
                    context.go('/profile');
                }
              },
            )
          : null,
    );
  }
}

class _OfflineBanner extends StatefulWidget {
  const _OfflineBanner();

  @override
  State<_OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<_OfflineBanner>
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
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off_rounded, size: 14, color: Colors.white70),
                SizedBox(width: 8),
                Text(
                  'You\'re offline — showing cached data',
                  style: TextStyle(
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
