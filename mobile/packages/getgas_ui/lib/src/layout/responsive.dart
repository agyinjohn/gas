import 'package:flutter/material.dart';

/// Responsive tokens for auth and shell layouts — mirrors web mobile max-width behavior.
class GetGasResponsive {
  static const contentMaxWidth = 400.0;

  static double screenWidth(BuildContext context) =>
      MediaQuery.sizeOf(context).width;

  static double screenHeight(BuildContext context) =>
      MediaQuery.sizeOf(context).height;

  static bool isCompactHeight(BuildContext context) =>
      screenHeight(context) < 640;

  static bool isCompactWidth(BuildContext context) => screenWidth(context) < 360;

  static bool isTablet(BuildContext context) => screenWidth(context) >= 600;

  /// Horizontal padding — tighter on narrow phones, wider on tablets.
  static double horizontalPadding(BuildContext context) {
    final w = screenWidth(context);
    if (w >= 600) return 32;
    if (w < 360) return 16;
    return 24;
  }

  /// Vertical padding — reduced on short screens so content fits without clipping.
  static double verticalPadding(BuildContext context) {
    if (isCompactHeight(context)) return 16;
    if (isTablet(context)) return 56;
    return 48;
  }

  /// Section gap — web `space-y-7` (28px), slightly tighter on short screens.
  static double sectionGap(BuildContext context) =>
      isCompactHeight(context) ? 20 : 28;

  /// Max content width capped at 400px, with side padding respected.
  static double contentWidth(BuildContext context) {
    final available = screenWidth(context) - horizontalPadding(context) * 2;
    return available.clamp(0, contentMaxWidth).toDouble();
  }

  /// OTP box size — scales down on very narrow screens (4 boxes + gaps).
  static double otpBoxSize(BuildContext context) {
    final content = contentWidth(context);
    // 4 boxes + 3 gaps of 12px each
    final maxPerBox = (content - 36) / 4;
    return maxPerBox.clamp(52, 64).toDouble();
  }

  static double otpBoxGap(BuildContext context) =>
      isCompactWidth(context) ? 8 : 12;
}

/// Scrollable centered column used by auth screens — responsive padding and max width.
class ResponsiveAuthScroll extends StatelessWidget {
  const ResponsiveAuthScroll({
    super.key,
    required this.child,
    this.minHeight,
  });

  final Widget child;
  final double? minHeight;

  @override
  Widget build(BuildContext context) {
    final hPad = GetGasResponsive.horizontalPadding(context);
    final vPad = GetGasResponsive.verticalPadding(context);
    final viewInsets = MediaQuery.viewInsetsOf(context).bottom;

    return SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(hPad, vPad, hPad, vPad + viewInsets),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: minHeight ??
                    (constraints.maxHeight - vPad * 2 - viewInsets).clamp(0, double.infinity),
              ),
              child: Align(
                alignment: Alignment.center,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: GetGasResponsive.contentMaxWidth,
                  ),
                  child: child,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Inserts responsive vertical spacing between auth sections.
class AuthSectionSpacer extends StatelessWidget {
  const AuthSectionSpacer({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(height: GetGasResponsive.sectionGap(context));
  }
}
