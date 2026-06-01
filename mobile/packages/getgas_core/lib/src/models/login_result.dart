import 'auth_user.dart';

class LoginResult {
  const LoginResult({
    required this.token,
    required this.user,
    this.needsProfile = false,
  });

  final String token;
  final AuthUser user;
  final bool needsProfile;
}
