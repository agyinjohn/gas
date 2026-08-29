import 'package:google_sign_in/google_sign_in.dart';
import 'package:getgas_core/getgas_core.dart';

class GoogleAuthResult {
  const GoogleAuthResult({
    required this.token,
    required this.userId,
    required this.name,
    this.needsProfile = false,
  });

  final String token;
  final String userId;
  final String name;
  final bool needsProfile;
}

class GoogleAuthService {
  GoogleAuthService(this._config);

  final AppConfig _config;

  static final _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    // serverClientId tells the SDK to include an ID token signed for this audience
    serverClientId: '509102065983-i861hv3bhdd70bc8vlblc2g8cgm1qf8i.apps.googleusercontent.com',
  );

  Future<GoogleAuthResult?> signIn() async {
    // Sign out first to force account picker every time
    await _googleSignIn.signOut();

    final account = await _googleSignIn.signIn();
    if (account == null) return null;

    final auth = await account.authentication;
    final idToken = auth.idToken;
    if (idToken == null) return null;

    // Exchange ID token for a GetGas JWT
    final client = GetGasApiClient(config: _config);
    final data = await client.postJson(
      '${AppConfig.apiPrefix}/auth/google/token',
      body: {'idToken': idToken},
    );

    final token  = data['token'] as String?;
    final userId = (data['user']?['id'] ?? data['user']?['_id'])?.toString();
    final name   = data['user']?['name'] as String? ?? account.displayName ?? 'User';

    if (token == null || userId == null) return null;

    return GoogleAuthResult(
      token: token,
      userId: userId,
      name: name,
      needsProfile: data['needsPhone'] == 1 || data['needsPhone'] == true,
    );
  }
}
