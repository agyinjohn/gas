import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

/// Sticky checkout header — mirrors web checkout/review header bar.
class CheckoutPageHeader extends StatelessWidget {
  const CheckoutPageHeader({
    super.key,
    required this.title,
    required this.onBack,
  });

  final String title;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: GetGasColors.bgCard,
      child: SafeArea(
        bottom: false,
        child: Container(
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: GetGasColors.border)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Material(
                color: GetGasColors.bgCard2,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: onBack,
                  customBorder: const CircleBorder(),
                  child: const SizedBox(
                    width: 36,
                    height: 36,
                    child: Icon(Icons.arrow_back, size: 20, color: GetGasColors.text),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: GetGasColors.text,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
