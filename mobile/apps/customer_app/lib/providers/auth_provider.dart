import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import '../data/secure_token_storage.dart';
import '../utils/profile_helpers.dart';

final appConfigProvider = Provider<AppConfig>(
  (_) => AppConfig.fromEnvironment(),
);

final tokenStorageProvider = Provider<TokenStorage>(
  (_) => SecureTokenStorage(),
);

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    config: ref.watch(appConfigProvider),
    storage: ref.watch(tokenStorageProvider),
  );
});

class AuthState {
  const AuthState({this.user, this.loading = true, this.needsProfile = false});

  final AuthUser? user;
  final bool loading;
  final bool needsProfile;

  bool get isLoggedIn => user != null;

  AuthState copyWith({AuthUser? user, bool? loading, bool? needsProfile}) {
    return AuthState(
      user: user ?? this.user,
      loading: loading ?? this.loading,
      needsProfile: needsProfile ?? this.needsProfile,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo) : super(const AuthState()) {
    _bootstrap();
  }

  final AuthRepository _repo;

  Future<void> _bootstrap() async {
    final user = await _repo.currentUser();
    final token = await _repo.currentToken();
    final loggedInUser = token != null ? user : null;
    state = AuthState(
      user: loggedInUser,
      loading: false,
      needsProfile: loggedInUser != null && userNeedsProfileCompletion(loggedInUser),
    );
  }

  Future<void> login(String phone, String password) async {
    final result = await _repo.loginCustomer(phone, password);
    state = AuthState(
      user: result.user,
      loading: false,
      needsProfile: result.needsProfile,
    );
  }

  Future<void> register({
    required String phoneE164,
    required String otp,
    required String name,
    required String password,
  }) async {
    final result = await _repo.register(
      phoneE164: phoneE164,
      otp: otp,
      name: name,
      password: password,
    );
    state = AuthState(user: result.user, loading: false);
  }

  Future<void> resetPassword({
    required String phoneE164,
    required String otp,
    required String newPassword,
  }) async {
    final result = await _repo.resetPassword(
      phoneE164: phoneE164,
      otp: otp,
      newPassword: newPassword,
    );
    state = AuthState(user: result.user, loading: false);
  }

  Future<void> signInWithGoogleResult({
    required String token,
    required String userId,
    required String name,
    bool needsProfile = false,
  }) async {
    final result = await _repo.completeGoogleSession(
      token: token,
      userId: userId,
      name: name,
      needsProfile: needsProfile,
    );
    state = AuthState(
      user: result.user,
      loading: false,
      needsProfile: result.needsProfile,
    );
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(loading: false);
  }

  void refreshUser(AuthUser user) {
    state = AuthState(
      user: user,
      loading: false,
      needsProfile: userNeedsProfileCompletion(user),
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
