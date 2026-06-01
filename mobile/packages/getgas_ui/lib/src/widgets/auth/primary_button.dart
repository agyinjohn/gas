import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';
import 'google_logo.dart';

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.showArrow = false,
    this.showCheck = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool showArrow;
  final bool showCheck;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: GetGasColors.brand,
          foregroundColor: Colors.white,
          disabledBackgroundColor: GetGasColors.brand.withValues(alpha: 0.6),
          elevation: 3,
          shadowColor: GetGasColors.brand.withValues(alpha: 0.25),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  if (showArrow) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward, size: 16),
                  ] else if (showCheck) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.check, size: 16),
                  ],
                ],
              ),
      ),
    );
  }
}

class GoogleOutlineButton extends StatelessWidget {
  const GoogleOutlineButton({
    super.key,
    required this.onPressed,
    this.loading = false,
  });

  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: OutlinedButton(
        onPressed: loading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: GetGasColors.bgCard,
          side: const BorderSide(color: GetGasColors.border, width: 2),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GoogleLogo(size: 20),
                  SizedBox(width: 12),
                  Text(
                    'Continue with Google',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: GetGasColors.text,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
