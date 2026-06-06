import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

import '../../theme/getgas_colors.dart';

class ActiveOrderBanner extends StatelessWidget {
  const ActiveOrderBanner({
    super.key,
    required this.order,
    required this.onTrack,
  });

  final GasOrder order;
  final VoidCallback onTrack;

  @override
  Widget build(BuildContext context) {
    final displayId = order.orderNumber ??
        (order.id.length >= 8
            ? order.id.substring(order.id.length - 8).toUpperCase()
            : order.id);

    return Container(
      decoration: BoxDecoration(
        color: GetGasColors.brand,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Order #$displayId',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.white.withValues(alpha: 0.70),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  homeOrderStatusLabel(order.status),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.2,
                  ),
                ),
                if (order.estimatedArrival != null &&
                    order.estimatedArrival!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      'Est. arrival: ${order.estimatedArrival}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.80),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: onTrack,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Text(
                    'Track',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: GetGasColors.brand,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.map_outlined, size: 15, color: GetGasColors.brand),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
