import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/checkout_review_screen.dart';
import 'screens/checkout_screen.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/help_screen.dart';
import 'screens/home_screen.dart';
import 'screens/location_screen.dart';
import 'screens/login_screen.dart';
import 'screens/loyalty_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/order_detail_screen.dart';
import 'screens/order_success_screen.dart';
import 'screens/orders_screen.dart';
import 'screens/payment_screen.dart';
import 'screens/privacy_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/register_screen.dart';
import 'screens/scheduled_orders_screen.dart';
import 'screens/terms_screen.dart';
import 'screens/track_detail_screen.dart';
import 'screens/track_screen.dart';
import 'shell/user_shell.dart';

const _publicAuthRoutes = {'/login', '/register', '/forgot-password'};

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      if (auth.loading) return null;

      final path = state.matchedLocation;
      final onAuthRoute = _publicAuthRoutes.contains(path);
      final loggedIn = auth.isLoggedIn;

      if (!loggedIn && !onAuthRoute) return '/login';
      if (loggedIn && onAuthRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'];
          return ForgotPasswordScreen(prefillPhone: phone);
        },
      ),
      GoRoute(
        path: '/location',
        builder: (context, state) {
          return LocationScreen(pickMode: state.uri.queryParameters['pick'] == '1');
        },
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => CheckoutScreen(params: state.uri.queryParameters),
      ),
      GoRoute(
        path: '/stations/:id',
        redirect: (_, state) => '/checkout?stationId=${state.pathParameters['id']}',
      ),
      GoRoute(
        path: '/checkout/review',
        builder: (context, state) => CheckoutReviewScreen(params: state.uri.queryParameters),
      ),
      GoRoute(
        path: '/payment',
        builder: (context, state) => PaymentScreen(params: state.uri.queryParameters),
      ),
      GoRoute(
        path: '/order-success',
        builder: (context, state) => OrderSuccessScreen(params: state.uri.queryParameters),
      ),
      ShellRoute(
        builder: (context, state, child) => UserShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/loyalty', builder: (_, __) => const LoyaltyScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
          GoRoute(
            path: '/orders/:id',
            builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/track', builder: (_, __) => const TrackScreen()),
          GoRoute(
            path: '/track/:id',
            builder: (context, state) => TrackDetailScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/scheduled', builder: (_, __) => const ScheduledOrdersScreen()),
          GoRoute(path: '/help', builder: (_, __) => const HelpScreen()),
          GoRoute(path: '/terms', builder: (_, __) => const TermsScreen()),
          GoRoute(path: '/privacy', builder: (_, __) => const PrivacyScreen()),
        ],
      ),
    ],
  );
});

class GetGasCustomerApp extends ConsumerWidget {
  const GetGasCustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'GetGas',
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
