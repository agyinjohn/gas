import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

/// Vertical gap between auth sections — web `space-y-7`.
const kAuthSectionGap = SizedBox(height: 28);

/// Step title block matching web `text-2xl font-black` + subtitle.
class AuthStepHeader extends StatelessWidget {
  const AuthStepHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.centered = false,
    this.subtitleWidget,
  });

  final String title;
  final String? subtitle;
  final Widget? subtitleWidget;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: centered ? CrossAxisAlignment.center : CrossAxisAlignment.stretch,
      children: [
        Text(
          title,
          textAlign: centered ? TextAlign.center : TextAlign.start,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: GetGasColors.text,
            letterSpacing: -0.5,
          ),
        ),
        if (subtitle != null || subtitleWidget != null) ...[
          const SizedBox(height: 4),
          if (subtitleWidget != null)
            subtitleWidget!
          else
            Text(
              subtitle!,
              textAlign: centered ? TextAlign.center : TextAlign.start,
              style: const TextStyle(fontSize: 14, color: GetGasColors.textMuted),
            ),
        ],
      ],
    );
  }
}

/// Footer line with optional tappable link — web auth footer pattern.
class AuthFooterLine extends StatelessWidget {
  const AuthFooterLine({
    super.key,
    required this.prefix,
    required this.linkText,
    required this.onLinkTap,
  });

  final String prefix;
  final String linkText;
  final VoidCallback onLinkTap;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        text: prefix,
        style: const TextStyle(color: GetGasColors.textMuted, fontSize: 14),
        children: [
          WidgetSpan(
            child: GestureDetector(
              onTap: onLinkTap,
              child: Text(
                linkText,
                style: const TextStyle(
                  color: GetGasColors.brand,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}

/// Secondary back/change action — web `ArrowLeft` link style.
class AuthBackLink extends StatelessWidget {
  const AuthBackLink({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.arrow_back, size: 14, color: GetGasColors.textMuted),
      label: Text(
        label,
        style: const TextStyle(fontSize: 14, color: GetGasColors.textMuted),
      ),
      style: TextButton.styleFrom(
        foregroundColor: GetGasColors.textMuted,
        padding: EdgeInsets.zero,
      ),
    );
  }
}
