import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../layout/responsive.dart';
import '../../theme/getgas_colors.dart';

/// Four OTP digit boxes — mirrors web register/forgot-password OtpBoxes.
class OtpBoxes extends StatefulWidget {
  const OtpBoxes({
    super.key,
    required this.value,
    required this.onChanged,
    this.hasError = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final bool hasError;

  @override
  State<OtpBoxes> createState() => _OtpBoxesState();
}

class _OtpBoxesState extends State<OtpBoxes> {
  final _focusNodes = List.generate(4, (_) => FocusNode());
  final _controllers = List.generate(4, (_) => TextEditingController());

  @override
  void initState() {
    super.initState();
    _syncFromValue(widget.value);
  }

  @override
  void didUpdateWidget(covariant OtpBoxes oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _syncFromValue(widget.value);
    }
  }

  void _syncFromValue(String value) {
    for (var i = 0; i < 4; i++) {
      final digit = i < value.length ? value[i] : '';
      if (_controllers[i].text != digit) {
        _controllers[i].text = digit;
      }
    }
  }

  @override
  void dispose() {
    for (final node in _focusNodes) {
      node.dispose();
    }
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _emit(String next) {
    widget.onChanged(next.length > 4 ? next.substring(0, 4) : next);
  }

  void _onChanged(int index, String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return;
    if (digits.length > 1) {
      _onPaste(digits);
      return;
    }

    final chars = List<String>.generate(4, (i) {
      if (i < widget.value.length) return widget.value[i];
      return '';
    });

    chars[index] = digits;
    _emit(chars.join());
    if (index < 3) {
      _focusNodes[index + 1].requestFocus();
    }
  }

  KeyEventResult _onKey(int index, KeyEvent event) {
    if (event is! KeyDownEvent || event.logicalKey != LogicalKeyboardKey.backspace) {
      return KeyEventResult.ignored;
    }

    final chars = widget.value.padRight(4).split('');
    if (index < widget.value.length && widget.value[index].isNotEmpty) {
      chars[index] = '';
      _emit(chars.join().trimRight());
    } else if (index > 0) {
      chars[index - 1] = '';
      _emit(chars.join().trimRight());
      _focusNodes[index - 1].requestFocus();
    }
    return KeyEventResult.handled;
  }

  void _onPaste(String pasted) {
    final digits = pasted.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return;
    final clipped = digits.length > 4 ? digits.substring(0, 4) : digits;
    _emit(clipped);
    _focusNodes[clipped.length.clamp(0, 3)].requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final boxSize = GetGasResponsive.otpBoxSize(context);
    final gap = GetGasResponsive.otpBoxGap(context);
    final fontSize = boxSize >= 60 ? 24.0 : 20.0;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (i) {
        final filled = i < widget.value.length;
        final borderColor = widget.hasError
            ? GetGasColors.error
            : filled
                ? GetGasColors.brand
                : GetGasColors.border;
        final bgColor = widget.hasError
            ? GetGasColors.error.withValues(alpha: 0.1)
            : filled
                ? GetGasColors.brand.withValues(alpha: 0.1)
                : GetGasColors.bgCard2;

        return Padding(
          padding: EdgeInsets.only(left: i == 0 ? 0 : gap),
          child: SizedBox(
            width: boxSize,
            height: boxSize,
            child: Focus(
              onKeyEvent: (_, event) => _onKey(i, event),
              child: TextField(
                controller: _controllers[i],
                focusNode: _focusNodes[i],
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 1,
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w900,
                  color: widget.hasError ? GetGasColors.error : GetGasColors.text,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  contentPadding: EdgeInsets.zero,
                  filled: true,
                  fillColor: bgColor,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: borderColor, width: 2),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: borderColor, width: 2),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: borderColor, width: 2),
                  ),
                ),
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (v) => _onChanged(i, v),
                onTap: () => _controllers[i].selection =
                    TextSelection.collapsed(offset: _controllers[i].text.length),
              ),
            ),
          ),
        );
      }),
    );
  }
}
