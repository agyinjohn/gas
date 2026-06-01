import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 4),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: GetGasColors.textMuted,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class PhonePrefixField extends StatelessWidget {
  const PhonePrefixField({
    super.key,
    required this.controller,
    this.errorText,
    this.onChanged,
  });

  final TextEditingController controller;
  final String? errorText;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard2,
                border: Border.all(
                  color: errorText != null ? const Color(0xFFF87171) : GetGasColors.border,
                ),
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
              ),
              alignment: Alignment.center,
              child: const Row(
                children: [
                  Text('🇬🇭', style: TextStyle(fontSize: 16)),
                  SizedBox(width: 6),
                  Text('+233', style: TextStyle(fontSize: 14, color: GetGasColors.textMuted)),
                ],
              ),
            ),
            Expanded(
              child: TextField(
                controller: controller,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                onChanged: onChanged,
                decoration: InputDecoration(
                  counterText: '',
                  hintText: 'XXXXXXXXX',
                  errorText: null,
                  filled: true,
                  fillColor: GetGasColors.bgCard2,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
                    borderSide: BorderSide(
                      color: errorText != null ? const Color(0xFFF87171) : GetGasColors.border,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
                    borderSide: BorderSide(
                      color: errorText != null ? const Color(0xFFF87171) : GetGasColors.border,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(12)),
                    borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
                  ),
                ),
              ),
            ),
          ],
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
