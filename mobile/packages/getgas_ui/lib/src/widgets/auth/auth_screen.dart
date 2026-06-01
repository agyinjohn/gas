import 'package:flutter/material.dart';

import '../../layout/responsive.dart';
import '../../theme/getgas_colors.dart';
import 'brand_logo.dart';

class AuthScreen extends StatelessWidget {
  const AuthScreen({
    super.key,
    required this.title,
    this.subtitle,
    required this.child,
    this.showBrandLogo = false,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final bool showBrandLogo;

  @override
  Widget build(BuildContext context) {
    return ResponsiveAuthScroll(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (showBrandLogo) ...[
            const Center(child: BrandLogo()),
            AuthSectionSpacer(),
          ],
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: GetGasColors.text,
              letterSpacing: -0.5,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: GetGasColors.textMuted),
            ),
          ],
          AuthSectionSpacer(),
          child,
        ],
      ),
    );
  }
}
