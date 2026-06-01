import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../widgets/complete_profile_sheet.dart';
import '../widgets/whatsapp_fab.dart';
import '../utils/profile_helpers.dart';
import '../providers/auth_provider.dart';
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
    final showCompleteProfile = user != null && userNeedsProfileCompletion(user);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        fit: StackFit.expand,
        children: [
          child,
          if (showFab) const WhatsAppFab(),
          if (showCompleteProfile) const CompleteProfileSheet(),
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
