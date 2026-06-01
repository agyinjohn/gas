import '../config/app_config.dart';
import '../models/order.dart';
import 'api_client.dart';

class OrdersApi {
  OrdersApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/orders';

  Future<List<GasOrder>> list({String? status, int? limit, int? page}) async {
    final data = await _client.getJson(
      _prefix,
      query: {
        if (status != null) 'status': status,
        if (limit != null) 'limit': limit,
        if (page != null) 'page': page,
      },
    );
    final list = data['orders'] as List<dynamic>? ?? [];
    return list.map((e) => GasOrder.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<GasOrder> getById(String id) async {
    final data = await _client.getJson('$_prefix/$id');
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson as Map<String, dynamic>);
  }

  Future<CreateOrderResult> create({
    required String stationId,
    required List<Map<String, dynamic>> cylinders,
    required String orderType,
    required Map<String, dynamic> deliveryAddress,
    Map<String, dynamic>? pickupAddress,
    required String paymentMethod,
    String? scheduledFor,
  }) async {
    final data = await _client.postJson(
      _prefix,
      body: {
        'stationId': stationId,
        'cylinders': cylinders,
        'orderType': orderType,
        'deliveryAddress': deliveryAddress,
        if (pickupAddress != null) 'pickupAddress': pickupAddress,
        'paymentMethod': paymentMethod,
        if (scheduledFor != null && scheduledFor.isNotEmpty) 'scheduledFor': scheduledFor,
      },
    );

    final orderJson = data['order'] as Map<String, dynamic>? ?? {};
    final payment = data['payment'] as Map<String, dynamic>?;
    final authUrl = payment?['authorizationUrl'] as String? ?? payment?['data']?['authorization_url'] as String?;

    return CreateOrderResult(
      order: GasOrder.fromJson(orderJson),
      authorizationUrl: authUrl,
    );
  }

  Future<GasOrder> updateStatus(String id, String status, {String? note}) async {
    final data = await _client.patchJson(
      '$_prefix/$id/status',
      body: {
        'status': status,
        if (note != null && note.isNotEmpty) 'note': note,
      },
    );
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson as Map<String, dynamic>);
  }

  Future<GasOrder> confirmDelivery(String id, String otp) async {
    final data = await _client.postJson(
      '$_prefix/$id/confirm-delivery',
      body: {'otp': otp},
    );
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson as Map<String, dynamic>);
  }

  Future<GasOrder> rate(String id, int rating, {String? comment}) async {
    final data = await _client.postJson(
      '$_prefix/$id/rate',
      body: {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
    final orderJson = data['order'] as Map<String, dynamic>? ?? data;
    return GasOrder.fromJson(orderJson as Map<String, dynamic>);
  }

  Future<void> reportIssue(String id, String category, String description) async {
    await _client.postJson(
      '$_prefix/$id/report-issue',
      body: {'category': category, 'description': description},
    );
  }
}
