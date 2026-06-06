class Rider {
  const Rider({
    required this.id,
    required this.name,
    required this.phone,
    required this.status,
    this.vehicleType,
    this.vehiclePlate,
    this.ratingAvg,
    this.totalTrips,
    this.totalEarnings,
    this.kycStatus,
    this.kycRejectionReason,
    this.bankAccount,
  });

  final String id;
  final String name;
  final String phone;
  final String status; // available | busy | offline
  final String? vehicleType;
  final String? vehiclePlate;
  final num? ratingAvg;
  final int? totalTrips;
  final num? totalEarnings;
  final String? kycStatus; // pending | approved | rejected
  final String? kycRejectionReason;
  final RiderBankAccount? bankAccount;

  bool get isOnline => status == 'available' || status == 'busy';

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'phone': phone,
        'status': status,
        if (vehicleType != null) 'vehicleType': vehicleType,
        if (vehiclePlate != null) 'vehiclePlate': vehiclePlate,
        if (ratingAvg != null) 'ratingAvg': ratingAvg,
        if (totalTrips != null) 'totalTrips': totalTrips,
        if (totalEarnings != null) 'totalEarnings': totalEarnings,
        if (kycStatus != null) 'kycStatus': kycStatus,
        if (kycRejectionReason != null) 'kycRejectionReason': kycRejectionReason,
        if (bankAccount != null) 'bankAccount': bankAccount!.toJson(),
      };

  factory Rider.fromJson(Map<String, dynamic> json) => Rider(
        id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        status: json['status'] as String? ?? 'offline',
        vehicleType: json['vehicleType'] as String?,
        vehiclePlate: json['vehiclePlate'] as String?,
        ratingAvg: json['ratingAvg'] as num?,
        totalTrips: (json['totalTrips'] as num?)?.toInt(),
        totalEarnings: json['totalEarnings'] as num?,
        kycStatus: json['kycStatus'] as String?,
        kycRejectionReason: json['kycRejectionReason'] as String?,
        bankAccount: json['bankAccount'] != null
            ? RiderBankAccount.fromJson(
                json['bankAccount'] as Map<String, dynamic>)
            : null,
      );
}

class RiderBankAccount {
  const RiderBankAccount({
    required this.provider,
    required this.accountNumber,
    required this.accountName,
  });

  final String provider;
  final String accountNumber;
  final String accountName;

  factory RiderBankAccount.fromJson(Map<String, dynamic> json) =>
      RiderBankAccount(
        provider: json['provider'] as String? ?? '',
        accountNumber: json['accountNumber'] as String? ?? '',
        accountName: json['accountName'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'provider': provider,
        'accountNumber': accountNumber,
        'accountName': accountName,
      };
}

class RiderDashboard {
  const RiderDashboard({
    this.todayEarnings = 0,
    this.todayTrips = 0,
    this.totalEarnings = 0,
    this.totalTrips = 0,
    this.ratingAvg,
  });

  final num todayEarnings;
  final int todayTrips;
  final num totalEarnings;
  final int totalTrips;
  final num? ratingAvg;

  factory RiderDashboard.fromJson(Map<String, dynamic> json) => RiderDashboard(
        todayEarnings: json['todayEarnings'] as num? ?? 0,
        todayTrips: (json['todayTrips'] as num?)?.toInt() ?? 0,
        totalEarnings: json['totalEarnings'] as num? ?? 0,
        totalTrips: (json['totalTrips'] as num?)?.toInt() ?? 0,
        ratingAvg: json['ratingAvg'] as num?,
      );

  Map<String, dynamic> toJson() => {
        'todayEarnings': todayEarnings,
        'todayTrips': todayTrips,
        'totalEarnings': totalEarnings,
        'totalTrips': totalTrips,
        if (ratingAvg != null) 'ratingAvg': ratingAvg,
      };
}

class RiderPayout {
  const RiderPayout({
    required this.id,
    required this.amountGHS,
    required this.status,
    required this.createdAt,
    this.orderId,
  });

  final String id;
  final num amountGHS;
  final String status; // pending | processing | completed | failed
  final String createdAt;
  final String? orderId;

  factory RiderPayout.fromJson(Map<String, dynamic> json) => RiderPayout(
        id: json['_id']?.toString() ?? '',
        amountGHS: json['amountGHS'] as num? ?? 0,
        status: json['status'] as String? ?? 'pending',
        createdAt: json['createdAt']?.toString() ?? '',
        orderId: (json['orderId'] is Map
                ? (json['orderId'] as Map)['_id']
                : json['orderId'])
            ?.toString(),
      );
}

/// Incoming order notification pushed via socket `order:new`.
class IncomingOrder {
  const IncomingOrder({
    required this.orderId,
    required this.cylinders,
    required this.orderType,
    required this.earning,
    required this.deliveryStreet,
    required this.deliveryCity,
  });

  final String orderId;
  final String cylinders;
  final String orderType;
  final num earning;
  final String deliveryStreet;
  final String deliveryCity;

  factory IncomingOrder.fromJson(Map<String, dynamic> json) {
    final addr = json['deliveryAddress'] as Map<String, dynamic>? ?? {};
    // cylinders may be a pre-formatted string or a list
    String cyl;
    final raw = json['cylinders'];
    if (raw is String) {
      cyl = raw;
    } else if (raw is List) {
      cyl = raw
          .map((e) => '${e['size']}kg×${e['quantity']}')
          .join(', ');
    } else {
      cyl = '${json['cylinderSize'] ?? '?'}kg';
    }
    return IncomingOrder(
      orderId: json['orderId']?.toString() ?? json['_id']?.toString() ?? '',
      cylinders: cyl,
      orderType: json['orderType'] as String? ?? '',
      earning: json['earning'] as num? ?? 0,
      deliveryStreet: addr['street'] as String? ?? '',
      deliveryCity: addr['city'] as String? ?? '',
    );
  }
}
