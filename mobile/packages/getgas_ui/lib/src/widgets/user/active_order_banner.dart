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
        (order.id.length >= 8 ? order.id.substring(order.id.length - 8).toUpperCase() : order.id);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.brand,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order #$displayId',
            style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      homeOrderStatusLabel(order.status),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    if (order.estimatedArrival != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Est. arrival: ${order.estimatedArrival}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Material(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  onTap: onTrack,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Text(
                          'Track',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: GetGasColors.text,
                          ),
                        ),
                        SizedBox(width: 6),
                        Icon(Icons.map_outlined, size: 16, color: GetGasColors.text),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
