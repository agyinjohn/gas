import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

import '../../theme/getgas_colors.dart';

/// Mobile header logo — icon stacked above wordmark (web `flex-col items-center gap-2`).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: GetGasColors.brand,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.local_fire_department, color: Colors.white, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          Brand.name,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: GetGasColors.text,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }
}
