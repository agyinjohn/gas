import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

/// Numbered section title — mirrors web checkout step headings.
class CheckoutSectionTitle extends StatelessWidget {
  const CheckoutSectionTitle({
    super.key,
    this.step,
    required this.title,
    this.subtitle,
  });

  final int? step;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final label = step != null ? '$step. $title' : title;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: GetGasColors.text,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(
            subtitle!,
            style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
          ),
        ],
      ],
    );
  }
}
