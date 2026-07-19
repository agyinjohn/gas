class OrderCylinder {
  const OrderCylinder({
    required this.size,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  final int size;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  factory OrderCylinder.fromJson(Map<String, dynamic> json) {
    return OrderCylinder(
      size: (json['size'] as num?)?.toInt() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'size': size,
        'quantity': quantity,
        'unitPrice': unitPrice,
        'subtotal': subtotal,
      };
}

class OrderAddress {
  const OrderAddress({
    required this.street,
    required this.city,
    required this.lat,
    required this.lng,
  });

  final String street;
  final String city;
  final double lat;
  final double lng;

  factory OrderAddress.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const OrderAddress(street: '', city: '', lat: 0, lng: 0);
    }
    return OrderAddress(
      street: json['street'] as String? ?? '',
      city: json['city'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'street': street,
        'city': city,
        'lat': lat,
        'lng': lng,
      };
}

class OrderRider {
  const OrderRider({
    required this.name,
    required this.phone,
    this.location,
  });

  final String name;
  final String phone;
  final RiderLocation? location;

  factory OrderRider.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const OrderRider(name: '', phone: '');
    return OrderRider(
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      location: json['location'] is Map<String, dynamic>
          ? RiderLocation.fromJson(json['location'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        if (location != null) 'location': {'lat': location!.lat, 'lng': location!.lng},
      };
}

class RiderLocation {
  const RiderLocation({required this.lat, required this.lng});

  final double lat;
  final double lng;

  factory RiderLocation.fromJson(Map<String, dynamic> json) {
    return RiderLocation(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
    );
  }

  bool get isValid => lat != 0 && lng != 0;

  /// Web ignores stale default Accra seed coordinates.
  bool get isStaleSeed =>
      (lat - 5.6037).abs() < 0.001 && (lng - (-0.187)).abs() < 0.001;
}

class OrderStation {
  const OrderStation({
    required this.id,
    required this.name,
    required this.address,
    this.lat = 0,
    this.lng = 0,
  });

  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;

  factory OrderStation.fromJson(dynamic json) {
    if (json is Map<String, dynamic>) {
      return OrderStation(
        id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
        name: json['name'] as String? ?? '',
        address: json['address'] as String? ?? '',
        lat: (json['lat'] as num?)?.toDouble() ?? 0,
        lng: (json['lng'] as num?)?.toDouble() ?? 0,
      );
    }
    return OrderStation(id: json?.toString() ?? '', name: '', address: '');
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'address': address,
        'lat': lat,
        'lng': lng,
      };
}
