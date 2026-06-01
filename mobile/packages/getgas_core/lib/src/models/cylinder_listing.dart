class CylinderListing {
  const CylinderListing({
    required this.size,
    required this.fillPrice,
    required this.exchangePrice,
    required this.stockCount,
    required this.isAvailable,
  });

  final int size;
  final num fillPrice;
  final num exchangePrice;
  final int stockCount;
  final bool isAvailable;

  factory CylinderListing.fromJson(Map<String, dynamic> json) {
    return CylinderListing(
      size: (json['size'] as num?)?.toInt() ?? 0,
      fillPrice: json['fillPrice'] as num? ?? 0,
      exchangePrice: json['exchangePrice'] as num? ?? 0,
      stockCount: (json['stockCount'] as num?)?.toInt() ?? 0,
      isAvailable: json['isAvailable'] as bool? ?? false,
    );
  }
}
