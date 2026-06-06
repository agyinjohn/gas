import '../config/app_config.dart';
import '../models/order.dart';
import '../models/rider.dart';
import 'api_client.dart';

class RidersApi {
  RidersApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/riders';
  static const _ordersPrefix = '${AppConfig.apiPrefix}/orders';

  Future<Rider> getMe() async {
    final data = await _client.getJson('$_prefix/me');
    return Rider.fromJson(data['rider'] as Map<String, dynamic>? ?? data);
  }

  Future<Rider> setStatus(String status) async {
    final data = await _client.patchJson(
      '$_prefix/status',
      body: {'status': status},
    );
    return Rider.fromJson(data['rider'] as Map<String, dynamic>? ?? data);
  }

  Future<void> updateLocation(double lat, double lng) async {
    await _client.patchJson(
      '$_prefix/location',
      body: {'lat': lat, 'lng': lng},
    );
  }

  Future<RiderDashboard> getDashboard() async {
    final data = await _client.getJson('$_prefix/dashboard');
    return RiderDashboard.fromJson(
        data['dashboard'] as Map<String, dynamic>? ?? data);
  }

  Future<List<GasOrder>> getOrders({String? status, int limit = 30}) async {
    final data = await _client.getJson(
      '$_prefix/orders',
      query: {
        if (status != null && status.isNotEmpty) 'status': status,
        'limit': limit,
      },
    );
    final list = data['orders'] as List<dynamic>? ?? [];
    return list
        .map((e) => GasOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<RiderPayout>> getPayouts() async {
    final data = await _client.getJson('$_prefix/payouts');
    final list = data['payouts'] as List<dynamic>? ?? [];
    return list
        .map((e) => RiderPayout.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Rider> updateBankAccount(RiderBankAccount account) async {
    final data = await _client.patchJson(
      '$_prefix/bank-account',
      body: account.toJson(),
    );
    return Rider.fromJson(data['rider'] as Map<String, dynamic>? ?? data);
  }

  // ── Order status actions ────────────────────────────────────────────────────

  Future<GasOrder> acceptOrder(String orderId) =>
      _updateOrderStatus(orderId, 'accepted');

  Future<GasOrder> arrivedAtStation(String orderId) =>
      _updateOrderStatus(orderId, 'at_station');

  Future<GasOrder> departedForDelivery(String orderId) =>
      _updateOrderStatus(orderId, 'en_route');

  Future<GasOrder> confirmOtp(String orderId, String otp) async {
    final data = await _client.postJson(
      '$_ordersPrefix/$orderId/confirm-otp',
      body: {'otp': otp},
    );
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson);
  }

  Future<GasOrder> _updateOrderStatus(String id, String status) async {
    final data = await _client.patchJson(
      '$_ordersPrefix/$id/status',
      body: {'status': status},
    );
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson);
  }

  Future<void> registerFcmToken(String token) async {
    await _client.patchJson(
      '$_prefix/fcm-token',
      body: {'token': token},
    );
  }
}
