import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:getgas_core/getgas_core.dart';

/// Optional dev banner — only when `--dart-define=SHOW_API_BANNER=true`.
class DevApiBanner extends StatelessWidget {
  const DevApiBanner({super.key});

  static const _show = bool.fromEnvironment('SHOW_API_BANNER', defaultValue: false);

  @override
  Widget build(BuildContext context) {
    if (!kDebugMode || !_show) return const SizedBox.shrink();

    final url = AppConfig.fromEnvironment().apiBaseUrl;

    return Material(
      color: const Color(0xFFFEF3C7),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Text(
          'API: $url',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: Color(0xFF92400E)),
        ),
      ),
    );
  }
}
