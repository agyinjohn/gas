import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    if (message == null || message!.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: GetGasColors.errorBg,
        border: Border.all(color: GetGasColors.errorBorder),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(message!, style: const TextStyle(fontSize: 14, color: GetGasColors.error)),
    );
  }
}
