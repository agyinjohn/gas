import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import '../data/secure_token_storage.dart';

final appConfigProvider = Provider<AppConfig>((_) => AppConfig.fromEnvironment());

final tokenStorageProvider = Provider<TokenStorage>((_) => SecureTokenStorage());

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    config: ref.watch(appConfigProvider),
    storage: ref.watch(tokenStorageProvider),
  );
});

class AuthState {
  const AuthState({this.user, this.loading = true});

  final AuthUser? user;
  final bool loading;

  bool get isLoggedIn => user != null;

  AuthState copyWith({AuthUser? user, bool? loading}) =>
      AuthState(user: user ?? this.user, loading: loading ?? this.loading);
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo) : super(const AuthState()) {
    _bootstrap();
  }

  final AuthRepository _repo;

  Future<void> _bootstrap() async {
    final token = await _repo.currentToken();
    final user = token != null ? await _repo.currentUser() : null;
    state = AuthState(user: user, loading: false);
  }

  Future<void> login(String phone, String password) async {
    final result = await _repo.loginRider(phone, password);
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

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState(loading: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
