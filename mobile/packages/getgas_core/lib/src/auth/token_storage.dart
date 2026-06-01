import '../models/auth_user.dart';

/// Persist session token + user JSON (implemented with secure storage in apps).
abstract class TokenStorage {
  Future<String?> readToken();
  Future<void> writeToken(String token);
  Future<void> clearToken();

  Future<AuthUser?> readUser();
  Future<void> writeUser(AuthUser user);
  Future<void> clearUser();

  Future<void> clearSession() async {
    await clearToken();
    await clearUser();
  }
}
