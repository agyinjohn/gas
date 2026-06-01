import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.controller,
    this.errorText,
    this.onChanged,
    this.hintText = 'Enter your password',
  });

  final TextEditingController controller;
  final String? errorText;
  final ValueChanged<String>? onChanged;
  final String hintText;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: !_visible,
      onChanged: widget.onChanged,
      decoration: InputDecoration(
        hintText: widget.hintText,
        errorText: widget.errorText,
        suffixIcon: IconButton(
          icon: Icon(
            _visible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
            size: 20,
            color: GetGasColors.textMuted,
          ),
          onPressed: () => setState(() => _visible = !_visible),
        ),
      ),
    );
  }
}
