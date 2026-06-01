import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

import '../../theme/getgas_colors.dart';

/// Nearby station card — mirrors web `StationCard` in `/user`.
class StationCard extends StatelessWidget {
  const StationCard({
    super.key,
    required this.station,
    required this.onTap,
  });

  final Station station;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final minPrice = station.minFillPrice;
    final deliveryFee = calcDeliveryFee(station.distanceKm);
    final unavailable = station.unavailable;

    return Material(
      color: GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Opacity(
          opacity: unavailable ? 0.6 : 1,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: GetGasColors.border),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: unavailable
                            ? GetGasColors.bgCard2
                            : GetGasColors.brand.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.local_fire_department,
                        size: 20,
                        color: unavailable ? GetGasColors.textMuted : GetGasColors.brand,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            station.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: GetGasColors.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            station.address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: GetGasColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, size: 16, color: GetGasColors.textMuted),
                  ],
                ),
                const Divider(height: 25, color: GetGasColors.border),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 12, color: GetGasColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      '${station.distanceKm} km',
                      style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 4),
                    Text(
                      station.ratingAvg.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFFF59E0B),
                      ),
                    ),
                    const Spacer(),
                    _StatusBadge(station: station),
                  ],
                ),
                const Divider(height: 25, color: GetGasColors.border),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Gas from',
                          style: TextStyle(fontSize: 10, color: GetGasColors.textMuted),
                        ),
                        Text(
                          minPrice != null ? 'GHS $minPrice' : '—',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: unavailable ? GetGasColors.textMuted : GetGasColors.brand,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'Delivery',
                          style: TextStyle(fontSize: 10, color: GetGasColors.textMuted),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.local_shipping_outlined, size: 12, color: GetGasColors.textMuted),
                            const SizedBox(width: 4),
                            Text(
                              'GHS $deliveryFee',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: GetGasColors.text,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.station});

  final Station station;

  @override
  Widget build(BuildContext context) {
    if (!station.isOpenNow) {
      return _badge('Closed today', const Color(0xFF6B7280), const Color(0x1A6B7280));
    }
    if (station.outOfStock) {
      return _badge('Out of stock', GetGasColors.error, GetGasColors.error.withValues(alpha: 0.1));
    }
    return _badge('Available', const Color(0xFF16A34A), const Color(0x1A22C55E));
  }

  Widget _badge(String text, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        text,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
