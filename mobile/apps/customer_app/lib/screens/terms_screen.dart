import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

import '../widgets/sub_page_scaffold.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  static const _sections = [
    ('1. Acceptance of Terms', 'By using GetGas you agree to these Terms of Service. GetGas is operated by GetGas Technologies Ltd in Ghana.'),
    ('2. Eligibility', 'You must be at least 18 years of age to use GetGas.'),
    ('3. Services Provided', 'GetGas connects customers with licensed LPG stations and delivery riders. We facilitate ordering, tracking, and payments.'),
    ('4. Orders and Delivery', 'Delivery times are estimates. You are responsible for being available at the delivery address to receive your order.'),
    ('5. Pricing and Payments', 'Prices are set by stations. Payments are processed securely through Paystack.'),
    ('6. Cancellations and Refunds', 'Cancellations before pickup may be eligible for refunds within 3–5 business days.'),
    ('7. User Conduct', 'You agree not to provide false information, harass riders, or submit fraudulent orders.'),
    ('8. Loyalty Programme', 'Points have no cash value and may be modified or terminated at any time.'),
    ('9. Limitation of Liability', 'GetGas liability is limited to the amount paid for the specific order giving rise to a claim.'),
  ];

  @override
  Widget build(BuildContext context) {
    return SubPageScaffold(
      title: 'Terms of Service',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _sections
            .map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: GetGasColors.bgCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: GetGasColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(s.$1, style: const TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        Text(s.$2, style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted, height: 1.5)),
                      ],
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}
