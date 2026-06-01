import '../config/app_config.dart';
import 'api_client.dart';

class PaymentsApi {
  PaymentsApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/payments';

  Future<Map<String, dynamic>> verify(String reference) async {
    return _client.getJson('$_prefix/verify/$reference');
  }
}
