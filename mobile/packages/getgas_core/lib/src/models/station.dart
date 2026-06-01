import 'cylinder_listing.dart';

class Station {
  const Station({
    required this.id,
    required this.name,
    required this.address,
    required this.lat,
    required this.lng,
    required this.distanceKm,
    required this.ratingAvg,
    required this.outOfStock,
    required this.isOpenNow,
    required this.cylinderListings,
  });

  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final double distanceKm;
  final double ratingAvg;
  final bool outOfStock;
  final bool isOpenNow;
  final List<CylinderListing> cylinderListings;

  bool get unavailable => outOfStock || !isOpenNow;

  num? get minFillPrice {
    final prices = cylinderListings
        .where((l) => l.fillPrice > 0)
        .map((l) => l.fillPrice)
        .toList();
    if (prices.isEmpty) return null;
    return prices.reduce((a, b) => a < b ? a : b);
  }

  factory Station.fromJson(Map<String, dynamic> json) {
    final listings = json['cylinderListings'] as List<dynamic>? ?? [];
    return Station(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
      ratingAvg: (json['ratingAvg'] as num?)?.toDouble() ?? 0,
      outOfStock: json['outOfStock'] as bool? ?? false,
      isOpenNow: json['isOpenNow'] as bool? ?? true,
      cylinderListings: listings
          .map((e) => CylinderListing.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
