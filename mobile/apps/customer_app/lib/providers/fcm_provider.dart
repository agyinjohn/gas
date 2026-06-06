import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/api_providers.dart';
import '../services/fcm_service.dart';

Future<void> registerFcmToken(Ref ref) async {
  try {
    final token = await FcmService.getToken();
    if (token == null) return;
    await ref.read(usersApiProvider).registerFcmToken(token);
  } catch (_) {}
}

final fcmTokenRegistrationProvider = Provider<void>((ref) {
  ref.listen<AuthState>(authProvider, (prev, next) async {
    if (next.isLoggedIn && prev?.isLoggedIn != true) {
      await registerFcmToken(ref);
    }
  });
});
