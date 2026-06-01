import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:getgas_core/getgas_core.dart';

const _googleRedirectUri = 'getgas://auth/callback';

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

  Future<GoogleAuthResult?> signIn() async {
    final authUrl =
        '${_config.apiBaseUrl}${AppConfig.apiPrefix}/auth/google?redirect=${Uri.encodeComponent(_googleRedirectUri)}';

    final callbackUrl = await FlutterWebAuth2.authenticate(
      url: authUrl,
      callbackUrlScheme: 'getgas',
    );

    return _parseCallback(callbackUrl);
  }

  GoogleAuthResult? _parseCallback(String url) {
    final uri = Uri.parse(url);
    final error = uri.queryParameters['error'];
    if (error != null && error.isNotEmpty) return null;

    final token = uri.queryParameters['token'];
    final userId = uri.queryParameters['userId'];
    final name = uri.queryParameters['name'] ?? 'User';
    if (token == null || userId == null) return null;

    return GoogleAuthResult(
      token: token,
      userId: userId,
      name: name,
      needsProfile: uri.queryParameters['needsPhone'] == '1',
    );
  }
}
