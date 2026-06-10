/// Loaded at startup from `assets/env/mobile.json` (synced from web `.env.local`).
class AppConfig {
  AppConfig({required this.apiBaseUrl});

  final String apiBaseUrl;

  /// Web app URL for links (rider apply, etc.). Override with `--dart-define=WEB_URL=`.
  String get webBaseUrl {
    const envWeb = String.fromEnvironment('WEB_URL');
    if (envWeb.isNotEmpty) return envWeb;
    final uri = Uri.parse(apiBaseUrl);
    final port = uri.port == 4000 ? 3000 : uri.port;
    return Uri(scheme: uri.scheme, host: uri.host, port: port).toString();
  }

  /// Socket.IO server URL. Defaults to [apiBaseUrl]. Override with `--dart-define=SOCKET_URL=`.
  String get socketUrl {
    const envSocket = String.fromEnvironment('SOCKET_URL');
    if (envSocket.isNotEmpty) return envSocket;
    return apiBaseUrl;
  }

  static const apiPrefix = '/api/v1';
  // Fallback only — always set API_URL via config/production.json at build time.
  static const defaultApiUrl = 'https://gas-1-io3c.onrender.com';

  static String? _runtimeApiUrl;

  /// Set from bundled env at startup.
  static void setApiUrl(String url) {
    final trimmed = url.trim();
    _runtimeApiUrl = trimmed.isEmpty ? null : trimmed;
  }

  static String? _runtimeGoogleMapsApiKey;

  /// Set from bundled env (synced from web) or tests.
  static void setGoogleMapsApiKey(String key) {
    final trimmed = key.trim();
    _runtimeGoogleMapsApiKey = trimmed.isEmpty ? null : trimmed;
  }

  /// Google Maps + Places — same key as web `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
  /// Sources (first match wins): `--dart-define`, then runtime [setGoogleMapsApiKey].
  static String get googleMapsApiKey {
    const fromDefine = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
    if (fromDefine.isNotEmpty) return fromDefine;
    return _runtimeGoogleMapsApiKey ?? '';
  }

  static bool get hasGoogleMapsKey => googleMapsApiKey.isNotEmpty;

  /// Resolve from `--dart-define=API_URL=http://192.168.x.x:4000`.
  factory AppConfig.fromEnvironment() {
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) {
      return AppConfig(apiBaseUrl: envUrl);
    }
    if (_runtimeApiUrl != null && _runtimeApiUrl!.isNotEmpty) {
      return AppConfig(apiBaseUrl: _runtimeApiUrl!);
    }
    return AppConfig(apiBaseUrl: defaultApiUrl);
  }
}
