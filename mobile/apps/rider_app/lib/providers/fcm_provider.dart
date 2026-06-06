import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/fcm_service.dart';
import 'api_providers.dart';
import 'auth_provider.dart';

/// Call once after login to register / refresh the FCM token on the server.
Future<void> registerFcmToken(Ref ref) async {
  try {
    final token = await FcmService.getToken();
    if (token == null) return;
    await ref.read(ridersApiProvider).registerFcmToken(token);
  } catch (_) {
    // Non-fatal — rider can still operate without push
  }
}

/// Watches auth state and registers token whenever the rider logs in.
final fcmTokenRegistrationProvider = Provider<void>((ref) {
  ref.listen<AuthState>(authProvider, (prev, next) async {
    if (next.isLoggedIn && prev?.isLoggedIn != true) {
      await registerFcmToken(ref);
    }
  });
});
