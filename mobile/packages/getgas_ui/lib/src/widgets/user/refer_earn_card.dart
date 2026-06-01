import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

class ReferEarnCard extends StatelessWidget {
  const ReferEarnCard({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border(
              top: const BorderSide(color: GetGasColors.border),
              right: const BorderSide(color: GetGasColors.border),
              bottom: const BorderSide(color: GetGasColors.border),
              left: const BorderSide(color: GetGasColors.brand, width: 4),
            ),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Refer & Earn GHS 20',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: GetGasColors.text,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Invite friends to GetGas and get discount on your next refill',
                      style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    ),
                  ],
                ),
              ),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.card_giftcard, color: GetGasColors.brand, size: 20),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
