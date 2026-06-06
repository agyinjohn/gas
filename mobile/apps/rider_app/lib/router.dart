import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:getgas_ui/getgas_ui.dart';

import 'main.dart' show navigatorKey;
import 'providers/auth_provider.dart';
import 'providers/fcm_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/earnings_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/navigation_screen.dart';
import 'shell/rider_shell.dart';

const _publicRoutes = {'/login', '/register', '/forgot-password'};

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/login',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      if (auth.loading) return null;
      final path = state.matchedLocation;
      final onPublic = _publicRoutes.contains(path);
      if (!auth.isLoggedIn && !onPublic) return '/login';
      if (auth.isLoggedIn && onPublic) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      ShellRoute(
        builder: (context, state, child) => RiderShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
          GoRoute(
            path: '/orders/:id',
            builder: (context, state) =>
                OrderDetailScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/earnings', builder: (_, __) => const EarningsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
      // Full-screen navigation — parentNavigatorKey forces it above the shell
      GoRoute(
        path: '/navigate/:id',
        parentNavigatorKey: navigatorKey,
        builder: (context, state) =>
            NavigationScreen(orderId: state.pathParameters['id']!),
      ),
    ],
  );
});

class GetGasRiderApp extends ConsumerWidget {
  const GetGasRiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    // Activate FCM token registration listener
    ref.watch(fcmTokenRegistrationProvider);

    return MaterialApp.router(
      title: 'GetGas Rider',
      theme: getGasTheme(),
      darkTheme: getGasDarkTheme(),
      themeMode: themeMode,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(this.ref) {
    ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }

  final Ref ref;
}
