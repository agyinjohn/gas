import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';

/// Draggable WhatsApp support button — mirrors web `WhatsAppFloatingButton`.
class WhatsAppFab extends ConsumerStatefulWidget {
  const WhatsAppFab({
    super.key,
    this.presetMessage = 'Hi! I need help with my order.',
  });

  final String presetMessage;

  @override
  ConsumerState<WhatsAppFab> createState() => _WhatsAppFabState();
}

class _WhatsAppFabState extends ConsumerState<WhatsAppFab> {
  static const _btnSize = 56.0;
  static const _posKey = 'whatsapp_btn_pos_v2';
  static const _whatsappGreen = Color(0xFF25D366);

  double _right = 24;
  double _bottom = 24;
  double? _dragStartX;
  double? _dragStartY;
  double? _startRight;
  double? _startBottom;
  bool _moved = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _bottom = 88;
    _loadPosition();
  }

  Future<void> _loadPosition() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_posKey);
      if (raw != null) {
        final parsed = jsonDecode(raw) as Map<String, dynamic>;
        final right = (parsed['right'] as num?)?.toDouble();
        final bottom = (parsed['bottom'] as num?)?.toDouble();
        if (right != null && bottom != null) {
          setState(() {
            _right = right;
            _bottom = bottom;
            _loaded = true;
          });
          return;
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loaded = true);
  }

  Future<void> _savePosition() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_posKey, jsonEncode({'right': _right, 'bottom': _bottom}));
  }

  void _onPanStart(DragStartDetails details) {
    _dragStartX = details.globalPosition.dx;
    _dragStartY = details.globalPosition.dy;
    _startRight = _right;
    _startBottom = _bottom;
    _moved = false;
  }

  void _onPanUpdate(DragUpdateDetails details, Size screen) {
    if (_dragStartX == null || _startRight == null || _startBottom == null) return;
    final dx = _dragStartX! - details.globalPosition.dx;
    final dy = _dragStartY! - details.globalPosition.dy;
    if (dx.abs() > 4 || dy.abs() > 4) _moved = true;

    final maxRight = screen.width - _btnSize - 8;
    final maxBottom = screen.height - _btnSize - 8;
    setState(() {
      _right = (_startRight! + dx).clamp(8.0, maxRight);
      _bottom = (_startBottom! + dy).clamp(8.0, maxBottom);
    });
  }

  void _onPanEnd(Size screen) {
    final mid = screen.width / 2;
    final left = screen.width - _right - _btnSize;
    final snappedLeft = left + _btnSize / 2 < mid ? 16.0 : screen.width - _btnSize - 16;
    setState(() {
      _right = (screen.width - snappedLeft - _btnSize).clamp(8.0, screen.width - _btnSize - 8);
      _bottom = _bottom.clamp(16.0, screen.height - _btnSize - 16);
    });
    _savePosition();
    _dragStartX = null;
    _dragStartY = null;
    _startRight = null;
    _startBottom = null;
  }

  Future<void> _openWhatsApp(String number) async {
    if (_moved) {
      _moved = false;
      return;
    }
    final clean = number.replaceAll(RegExp(r'[+\s\-()]'), '');
    final uri = Uri.parse(
      'https://wa.me/$clean?text=${Uri.encodeComponent(widget.presetMessage)}',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return const Positioned(right: 24, bottom: 88, child: SizedBox.shrink());
    }

    final configAsync = ref.watch(_whatsappConfigProvider);
    final screen = MediaQuery.sizeOf(context);

    return configAsync.when(
      loading: () => _fabPositioned(screen, null, loading: true),
      error: (_, __) => _fabPositioned(screen, null, loading: true),
      data: (number) {
        if (number == null) return const SizedBox.shrink();
        return _fabPositioned(screen, number);
      },
    );
  }

  Widget _fabPositioned(Size screen, String? number, {bool loading = false}) {
    return Positioned(
      right: _right,
      bottom: _bottom,
      child: GestureDetector(
        onPanStart: _onPanStart,
        onPanUpdate: (d) => _onPanUpdate(d, screen),
        onPanEnd: (_) => _onPanEnd(screen),
        onTap: number != null ? () => _openWhatsApp(number) : null,
        child: _FabShell(
          onTap: number != null ? () => _openWhatsApp(number) : null,
          child: loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : SvgPicture.string(_whatsappIconSvg, width: 28, height: 28),
        ),
      ),
    );
  }

  static const _whatsappIconSvg = '''
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 4C13 4 4 13 4 24c0 3.6 1 7 2.7 9.9L4 44l10.4-2.7C17.2 43 20.5 44 24 44c11 0 20-9 20-20S35 4 24 4z" fill="#fff"/>
  <path d="M24 7.2C14.8 7.2 7.2 14.8 7.2 24c0 3.3.9 6.4 2.6 9.1l.4.7-1.7 6.2 6.4-1.7.7.4c2.6 1.5 5.6 2.4 8.7 2.4 9.2 0 16.8-7.6 16.8-16.8S33.2 7.2 24 7.2z" fill="#25D366"/>
  <path d="M17.5 14.5c-.4-1-.8-1-.9-1h-.8c-.3 0-.7.1-1.1.5-.4.4-1.5 1.4-1.5 3.5s1.5 4 1.7 4.3c.2.3 3 4.7 7.3 6.4 3.6 1.4 4.3 1.1 5.1 1 .8-.1 2.5-1 2.9-2s.4-1.8.3-2c-.1-.2-.4-.3-.9-.5s-2.5-1.2-2.9-1.4c-.4-.2-.7-.2-1 .2-.3.4-1.1 1.4-1.4 1.7-.3.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.3-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3 0-.6-.1-.8-.1-.3-.9-2.3-1.2-3.1z" fill="#fff"/>
</svg>
''';
}

class _FabShell extends StatelessWidget {
  const _FabShell({required this.onTap, required this.child});

  final VoidCallback? onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 6,
      shadowColor: Colors.black26,
      color: onTap == null ? _WhatsAppFabState._whatsappGreen.withValues(alpha: 0.5) : _WhatsAppFabState._whatsappGreen,
      shape: const CircleBorder(),
      child: SizedBox(
        width: _WhatsAppFabState._btnSize,
        height: _WhatsAppFabState._btnSize,
        child: Center(child: child),
      ),
    );
  }
}

final _whatsappConfigProvider = FutureProvider<String?>((ref) {
  return ref.watch(stationsApiProvider).getSupportWhatsApp();
});
