class PricingConfig {
  const PricingConfig({
    required this.baseFee,
    required this.pricePerKm,
    required this.freeKm,
    required this.maxDeliveryFee,
  });

  final double baseFee;
  final double pricePerKm;
  final double freeKm;
  final double maxDeliveryFee;

  static const defaults = PricingConfig(
    baseFee: 5,
    pricePerKm: 2,
    freeKm: 2,
    maxDeliveryFee: 50,
  );

  factory PricingConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) return defaults;
    return PricingConfig(
      baseFee: (json['baseFee'] as num?)?.toDouble() ?? defaults.baseFee,
      pricePerKm: (json['pricePerKm'] as num?)?.toDouble() ?? defaults.pricePerKm,
      freeKm: (json['freeKm'] as num?)?.toDouble() ?? defaults.freeKm,
      maxDeliveryFee: (json['maxDeliveryFee'] as num?)?.toDouble() ?? defaults.maxDeliveryFee,
    );
  }
}
