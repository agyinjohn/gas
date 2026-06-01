import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

/// Single-line auth input — name, confirm password, etc.
class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.controller,
    this.placeholder,
    this.errorText,
    this.obscureText = false,
    this.onChanged,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String? placeholder;
  final String? errorText;
  final bool obscureText;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          obscureText: obscureText,
          onChanged: onChanged,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: placeholder,
            errorText: null,
            filled: true,
            fillColor: GetGasColors.bgCard2,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: errorText != null ? const Color(0xFFF87171) : GetGasColors.border,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: errorText != null ? const Color(0xFFF87171) : GetGasColors.border,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
            ),
          ),
        ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(errorText!, style: const TextStyle(fontSize: 12, color: GetGasColors.error)),
          ),
      ],
    );
  }
}
