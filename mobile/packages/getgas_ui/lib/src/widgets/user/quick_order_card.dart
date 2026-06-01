import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

/// Quick order block — mirrors web `/user` quick order card.
class QuickOrderCard extends StatefulWidget {
  const QuickOrderCard({
    super.key,
    required this.controller,
    required this.loading,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final bool loading;
  final VoidCallback onSubmit;

  @override
  State<QuickOrderCard> createState() => _QuickOrderCardState();
}

class _QuickOrderCardState extends State<QuickOrderCard> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final canSubmit = !widget.loading && widget.controller.text.trim().isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Quick Order',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GetGasColors.text),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: GetGasColors.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: GetGasColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'How much do you want to fill?',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: GetGasColors.text),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 48,
                child: TextField(
                  controller: widget.controller,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  enabled: !widget.loading,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  decoration: InputDecoration(
                    prefixText: '₵ ',
                    prefixStyle: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: GetGasColors.textMuted,
                    ),
                    hintText: '50',
                    hintStyle: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: GetGasColors.textMuted.withValues(alpha: 0.35),
                    ),
                    filled: true,
                    fillColor: GetGasColors.bgCard2,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: canSubmit ? widget.onSubmit : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GetGasColors.brand,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: GetGasColors.brand.withValues(alpha: 0.5),
                    disabledForegroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: widget.loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'Place Order',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
