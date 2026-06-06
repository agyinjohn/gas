import 'dart:convert';

import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../config/app_config.dart';
import '../domain/ghana_phone.dart';
import '../models/auth_user.dart';
import '../models/login_result.dart';
import 'token_storage.dart';

class AuthRepository {
  AuthRepository({
    required AppConfig config,
    required TokenStorage storage,
    GetGasApiClient? client,
  })  : _storage = storage,
        _config = config {
    final c = client ?? GetGasApiClient(config: config);
    _client = c;
    _authApi = AuthApi(c);
  }

  final TokenStorage _storage;
  final AppConfig _config;
  late final GetGasApiClient _client;
  late final AuthApi _authApi;

  AppConfig get config => _config;

  GetGasApiClient get client => _client;

  AuthApi get authApi => _authApi;

  Future<AuthUser?> currentUser() => _storage.readUser();

  Future<String?> currentToken() async {
    final token = await _storage.readToken();
    if (token != null) _client.setAuthToken(token);
    return token;
  }

  Future<LoginResult> loginCustomer(String phoneLocal, String password) async {
    final e164 = normalizeGhanaPhone(phoneLocal);
    final result = await _authApi.userLogin(e164, password);
    await _persistSession(result);
    return result;
  }

  Future<LoginResult> loginRider(String phoneLocal, String password) async {
    final e164 = normalizeGhanaPhone(phoneLocal);
    final result = await _authApi.riderLogin(e164, password);
    await _persistSession(result);
    return result;
  }

  Future<void> logout() async {
    await _storage.clearSession();
    _client.setAuthToken(null);
  }

  Future<Map<String, dynamic>> sendOtp(String phoneLocal, String purpose) async {
    final e164 = normalizeGhanaPhone(phoneLocal);
    return _authApi.sendOtp(e164, purpose);
  }

  Future<LoginResult> register({
    required String phoneE164,
    required String otp,
    required String name,
    required String password,
  }) async {
    final result = await _authApi.register(
      phone: phoneE164,
      otp: otp,
      name: name.trim(),
      password: password,
    );
    await _persistSession(result);
    return result;
  }

  Future<LoginResult> resetPassword({
    required String phoneE164,
    required String otp,
    required String newPassword,
  }) async {
    final result = await _authApi.resetPassword(phoneE164, otp, newPassword);
    await _persistSession(result);
    return result;
  }

  Future<LoginResult> completeGoogleSession({
    required String token,
    required String userId,
    required String name,
    String phone = '',
    bool needsProfile = false,
  }) async {
    final result = LoginResult(
      token: token,
      user: AuthUser(id: userId, name: name, phone: phone, role: UserRole.user),
      needsProfile: needsProfile,
    );
    await _persistSession(result);
    return result;
  }

  Future<LoginResult> addPhone(String phoneLocal) async {
    final e164 = normalizeGhanaPhone(phoneLocal);
    final result = await _authApi.addPhone(e164);
    await _persistSession(result);
    return result;
  }

  Future<void> updateStoredUser(AuthUser user) async {
    await _storage.writeUser(user);
  }

  Future<void> _persistSession(LoginResult result) async {
    await _storage.writeToken(result.token);
    await _storage.writeUser(result.user);
    _client.setAuthToken(result.token);
  }
}

AuthUser? authUserFromJsonString(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  try {
    return AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
}

String authUserToJsonString(AuthUser user) => jsonEncode(user.toJson());
