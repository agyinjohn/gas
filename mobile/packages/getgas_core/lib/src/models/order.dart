import 'order_detail.dart';

class GasOrder {
  const GasOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    this.estimatedArrival,
    this.totalAmount,
    this.finalAmount,
    this.deliveryFee,
    this.createdAt,
    this.paymentMethod,
    this.cylinders = const [],
    this.deliveryAddress,
    this.pickupAddress,
    this.station,
    this.rider,
    this.scheduledFor,
    this.paystackReference,
    this.riderRating,
  });

  final String id;
  final String? orderNumber;
  final String status;
  final String? estimatedArrival;
  final num? totalAmount;
  final num? finalAmount;
  final num? deliveryFee;
  final String? createdAt;
  final String? paymentMethod;
  final List<OrderCylinder> cylinders;
  final OrderAddress? deliveryAddress;
  final OrderAddress? pickupAddress;
  final OrderStation? station;
  final OrderRider? rider;
  final String? scheduledFor;
  final String? paystackReference;
  final num? riderRating;

  bool get isActive => status != 'delivered' && status != 'cancelled';

  String get displayNumber {
    if (orderNumber != null && orderNumber!.isNotEmpty) return orderNumber!;
    if (id.length >= 8) return id.substring(id.length - 8).toUpperCase();
    return id.toUpperCase();
  }

  num get displayTotal => finalAmount ?? totalAmount ?? 0;

  factory GasOrder.fromJson(Map<String, dynamic> json) {
    final cylindersRaw = json['cylinders'] as List<dynamic>? ?? [];
    return GasOrder(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      orderNumber: json['orderNumber'] as String?,
      status: json['status'] as String? ?? '',
      estimatedArrival: json['estimatedArrival']?.toString(),
      totalAmount: json['totalAmount'] as num?,
      finalAmount: json['finalAmount'] as num?,
      deliveryFee: json['deliveryFee'] as num?,
      createdAt: json['createdAt']?.toString(),
      paymentMethod: json['paymentMethod'] as String?,
      scheduledFor: json['scheduledFor']?.toString(),
      paystackReference: json['paystackReference'] as String?,
      riderRating: json['riderRating'] as num?,
      cylinders: cylindersRaw
          .map((e) => OrderCylinder.fromJson(e as Map<String, dynamic>))
          .toList(),
      deliveryAddress: json['deliveryAddress'] != null
          ? OrderAddress.fromJson(json['deliveryAddress'] as Map<String, dynamic>)
          : null,
      pickupAddress: json['pickupAddress'] != null
          ? OrderAddress.fromJson(json['pickupAddress'] as Map<String, dynamic>)
          : null,
      station: json['stationId'] != null
          ? OrderStation.fromJson(json['stationId'])
          : null,
      rider: json['riderId'] != null
          ? OrderRider.fromJson(json['riderId'] as Map<String, dynamic>?)
          : null,
    );
  }
}

class CreateOrderResult {
  const CreateOrderResult({
    required this.order,
    this.authorizationUrl,
  });

  final GasOrder order;
  final String? authorizationUrl;
}
