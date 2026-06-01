class SavedAddress {
  const SavedAddress({
    required this.id,
    required this.label,
    required this.street,
    required this.city,
    required this.lat,
    required this.lng,
    this.isDefault = false,
  });

  final String id;
  final String label;
  final String street;
  final String city;
  final double lat;
  final double lng;
  final bool isDefault;

  factory SavedAddress.fromJson(Map<String, dynamic> json) {
    return SavedAddress(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      label: json['label'] as String? ?? '',
      street: json['street'] as String? ?? '',
      city: json['city'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'label': label,
        'street': street,
        'city': city,
        'lat': lat,
        'lng': lng,
        'isDefault': isDefault,
      };
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.phone,
    this.totalOrders = 0,
    this.loyaltyPoints = 0,
    this.savedAddresses = const [],
  });

  final String id;
  final String name;
  final String phone;
  final int totalOrders;
  final int loyaltyPoints;
  final List<SavedAddress> savedAddresses;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final addressesRaw = json['savedAddresses'] as List<dynamic>? ?? [];
    return UserProfile(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      totalOrders: (json['totalOrders'] as num?)?.toInt() ?? 0,
      loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
      savedAddresses: addressesRaw
          .map((e) => SavedAddress.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

List<SavedAddress> parseAddressesList(dynamic raw) {
  if (raw is! List) return [];
  return raw.map((e) => SavedAddress.fromJson(e as Map<String, dynamic>)).toList();
}
