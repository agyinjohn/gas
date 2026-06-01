import 'package:flutter/material.dart';

import '../../layout/responsive.dart';
import '../../theme/getgas_colors.dart';
import 'brand_logo.dart';

/// Scrollable mobile auth layout — web right panel (`max-w-[400px] space-y-7`).
class AuthFlowLayout extends StatelessWidget {
  const AuthFlowLayout({
    super.key,
    required this.sections,
    this.showBrandLogo = true,
  });

  final List<Widget> sections;
  final bool showBrandLogo;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    if (showBrandLogo) {
      children.add(const Center(child: BrandLogo()));
    }
    for (final section in sections) {
      if (children.isNotEmpty) {
        children.add(AuthSectionSpacer());
      }
      children.add(section);
    }

    return ResponsiveAuthScroll(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: children,
      ),
    );
  }
}

/// OTP resend countdown helper — mirrors web 90s timer.
class OtpCountdownController {
  OtpCountdownController({this.onTick});

  final VoidCallback? onTick;
  int seconds = 0;
  bool canResend = true;

  String get timeString {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  void start({int initialSeconds = 90}) {
    seconds = initialSeconds;
    canResend = false;
    onTick?.call();
  }

  void tick() {
    if (seconds <= 1) {
      seconds = 0;
      canResend = true;
    } else {
      seconds -= 1;
    }
    onTick?.call();
  }
}

/// Resend row under OTP boxes.
class OtpResendRow extends StatelessWidget {
  const OtpResendRow({
    super.key,
    required this.canResend,
    required this.timeString,
    required this.onResend,
    this.resending = false,
  });

  final bool canResend;
  final String timeString;
  final VoidCallback onResend;
  final bool resending;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        text: "Didn't receive it? ",
        style: const TextStyle(color: GetGasColors.textMuted, fontSize: 14),
        children: [
          if (canResend)
            WidgetSpan(
              child: GestureDetector(
                onTap: resending ? null : onResend,
                child: Text(
                  resending ? 'Sending…' : 'Resend',
                  style: TextStyle(
                    color: GetGasColors.brand,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    decoration: resending ? null : TextDecoration.underline,
                  ),
                ),
              ),
            )
          else
            TextSpan(
              text: timeString,
              style: const TextStyle(
                color: GetGasColors.brand,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}
