import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

import '../../theme/getgas_colors.dart';

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

    return Opacity(
      opacity: unavailable ? 0.55 : 1,
      child: Material(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: GetGasColors.border),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Row 1: icon + name/address + chevron ──
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: unavailable
                            ? GetGasColors.bgCard2
                            : GetGasColors.brand.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.local_fire_department_rounded,
                        size: 24,
                        color: unavailable
                            ? GetGasColors.textMuted
                            : GetGasColors.brand,
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
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: GetGasColors.text,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            station.address,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              color: GetGasColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: GetGasColors.textMuted,
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                const Divider(height: 1, color: GetGasColors.border),
                const SizedBox(height: 12),

                // ── Row 2: distance + rating + status badge ──
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 15, color: GetGasColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      '${station.distanceKm} km',
                      style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(width: 14),
                    const Icon(Icons.star_rounded, size: 15, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 4),
                    Text(
                      station.ratingAvg.toStringAsFixed(1),
                      style: const TextStyle(fontSize: 13, color: Color(0xFFF59E0B), fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    _StatusBadge(station: station),
                  ],
                ),

                const SizedBox(height: 12),
                const Divider(height: 1, color: GetGasColors.border),
                const SizedBox(height: 12),

                // ── Row 3: price + delivery ──
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Gas from',
                            style: TextStyle(fontSize: 11, color: GetGasColors.textMuted),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            minPrice != null ? 'GHS $minPrice' : '—',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: unavailable ? GetGasColors.textMuted : GetGasColors.brand,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'Delivery',
                          style: TextStyle(fontSize: 11, color: GetGasColors.textMuted),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.local_shipping_outlined, size: 14, color: GetGasColors.textMuted),
                            const SizedBox(width: 4),
                            Text(
                              'GHS $deliveryFee',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
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
      return _badge('Closed today', const Color(0xFF6B7280), const Color(0xFFF3F4F6));
    }
    if (station.outOfStock) {
      return _badge('Out of stock', GetGasColors.error, GetGasColors.errorBg);
    }
    return _badge('Available', const Color(0xFF16A34A), const Color(0xFFDCFCE7));
  }

  Widget _badge(String text, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
