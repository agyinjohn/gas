import 'dart:math' as math;

import '../models/pricing_config.dart';

const deliveryBaseFee = 15;
const deliveryRatePerKm = 5;
const deliveryDistanceFactor = 1.5;
const minCylinderPrice = 20;

/// Effective distance = factor × straight-line km; fee floored at base.
int calcDeliveryFee(double distanceKm) {
  final effective = deliveryDistanceFactor * distanceKm;
  return (effective * deliveryRatePerKm).round().clamp(deliveryBaseFee, 999999);
}

const earthRadiusKm = 6371;

double haversineDistanceKm(
  double lat1,
  double lng1,
  double lat2,
  double lng2,
) {
  double toRad(double deg) => deg * math.pi / 180;
  final dLat = toRad(lat2 - lat1);
  final dLng = toRad(lng2 - lng1);
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.cos(toRad(lat1)) * math.cos(toRad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  return earthRadiusKm * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

/// Checkout delivery fee — mirrors backend `geoService.calcDeliveryFee`.
double calcDeliveryFeeFromCoords({
  required double userLat,
  required double userLng,
  required double stationLat,
  required double stationLng,
  required PricingConfig config,
}) {
  final distKm = haversineDistanceKm(userLat, userLng, stationLat, stationLng);
  final billableKm = math.max(0, distKm - config.freeKm);
  final fee = config.baseFee + billableKm * config.pricePerKm;
  return double.parse(
    math.min(config.maxDeliveryFee, math.max(config.baseFee, fee)).toStringAsFixed(2),
  );
}

String formatCurrency(num amount) => 'GH₵${amount.toStringAsFixed(2)}';
