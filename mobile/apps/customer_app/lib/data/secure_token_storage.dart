import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:getgas_core/getgas_core.dart';

class SecureTokenStorage implements TokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> clearToken() => _storage.delete(key: StorageKeys.token);

  @override
  Future<void> clearUser() => _storage.delete(key: StorageKeys.user);

  @override
  Future<String?> readToken() => _storage.read(key: StorageKeys.token);

  @override
  Future<AuthUser?> readUser() async {
    final raw = await _storage.read(key: StorageKeys.user);
    return authUserFromJsonString(raw);
  }

  @override
  Future<void> writeToken(String token) =>
      _storage.write(key: StorageKeys.token, value: token);

  @override
  Future<void> writeUser(AuthUser user) =>
      _storage.write(key: StorageKeys.user, value: authUserToJsonString(user));

  @override
  Future<void> clearSession() async {
    await clearToken();
    await clearUser();
  }
}
