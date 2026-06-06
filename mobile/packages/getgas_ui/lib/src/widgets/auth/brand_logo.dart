import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

import '../../theme/getgas_colors.dart';

/// Mobile header logo — app icon stacked above wordmark.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 72});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(size * 0.22),
          child: Image(
            image: const AssetImage(
              'lib/assets/app_icon.png',
              package: 'getgas_ui',
            ),
            width: size,
            height: size,
            fit: BoxFit.cover,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          Brand.name,
          style: TextStyle(
            fontSize: size * 0.25,
            fontWeight: FontWeight.w900,
            color: GetGasColors.brand,
            letterSpacing: -0.3,
          ),
        ),
      ],
    );
  }
}
