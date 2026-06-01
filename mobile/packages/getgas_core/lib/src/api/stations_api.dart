import '../config/app_config.dart';
import '../models/pricing_config.dart';
import '../models/station.dart';
import 'api_client.dart';

class StationsApi {
  StationsApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/stations';

  Future<List<Station>> getNearby({
    required double lat,
    required double lng,
    double radius = 10,
    int? size,
  }) async {
    final data = await _client.getJson(
      '$_prefix/nearby',
      query: {
        'lat': lat,
        'lng': lng,
        'radius': radius,
        if (size != null) 'size': size,
      },
    );
    final list = data['stations'] as List<dynamic>? ?? [];
    return list.map((e) => Station.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Station> getById(String id) async {
    final data = await _client.getJson('$_prefix/$id');
    final stationJson = data['station'] as Map<String, dynamic>? ?? {};
    return Station.fromJson(stationJson);
  }

  Future<String?> getSupportWhatsApp() async {
    final data = await _client.getJson('$_prefix/system-config');
    final config = data['config'] as Map<String, dynamic>?;
    final number = config?['supportWhatsApp'] as String?;
    if (number == null || number.trim().isEmpty) return null;
    return number;
  }

  Future<PricingConfig> getPricing() async {
    final data = await _client.getJson('$_prefix/pricing');
    final pricing = data['pricing'] as Map<String, dynamic>?;
    return PricingConfig.fromJson(pricing);
  }
}
