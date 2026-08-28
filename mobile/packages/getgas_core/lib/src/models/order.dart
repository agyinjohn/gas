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
    this.orderType,
    this.otpCode,
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
  final String? orderType;
  final String? otpCode;

  bool get isActive => status != 'delivered' && status != 'cancelled';

  static final _mongoId = RegExp(r'^[0-9a-fA-F]{24}$');

  /// Whether [id] is a valid Mongo ObjectId. Stale/corrupt cache entries can
  /// carry bad ids — the backend rejects those with a 400 on `/orders/:id`.
  bool get hasValidId => _mongoId.hasMatch(id);

  Map<String, dynamic> toJson() => {
        'id': id,
        '_id': id,
        if (orderNumber != null) 'orderNumber': orderNumber,
        'status': status,
        if (estimatedArrival != null) 'estimatedArrival': estimatedArrival,
        if (totalAmount != null) 'totalAmount': totalAmount,
        if (finalAmount != null) 'finalAmount': finalAmount,
        if (deliveryFee != null) 'deliveryFee': deliveryFee,
        if (createdAt != null) 'createdAt': createdAt,
        if (paymentMethod != null) 'paymentMethod': paymentMethod,
        if (orderType != null) 'orderType': orderType,
        if (scheduledFor != null) 'scheduledFor': scheduledFor,
        if (paystackReference != null) 'paystackReference': paystackReference,
        if (riderRating != null) 'riderRating': riderRating,
        if (otpCode != null) 'otpCode': otpCode,
        'cylinders': cylinders.map((c) => c.toJson()).toList(),
        if (deliveryAddress != null) 'deliveryAddress': deliveryAddress!.toJson(),
        if (pickupAddress != null) 'pickupAddress': pickupAddress!.toJson(),
        if (station != null) 'stationId': station!.toJson(),
        if (rider != null) 'riderId': rider!.toJson(),
      };

  String get displayNumber {
    if (orderNumber != null && orderNumber!.isNotEmpty) return orderNumber!;
    if (id.length >= 8) return id.substring(id.length - 8).toUpperCase();
    return id.toUpperCase();
  }

  num get displayTotal => finalAmount ?? totalAmount ?? 0;

  factory GasOrder.fromJson(Map<String, dynamic> json) {
    final cylindersRaw = json['cylinders'] as List<dynamic>? ?? [];
    return GasOrder(
      id: json['id']?.toString() ?? (json['_id'] is Map ? json['_id']['\$oid']?.toString() : json['_id']?.toString()) ?? '',
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
      orderType: json['orderType'] as String?,
      otpCode: json['otpCode'] as String?,
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
      rider: json['riderId'] is Map
          ? OrderRider.fromJson(json['riderId'] as Map<String, dynamic>)
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
