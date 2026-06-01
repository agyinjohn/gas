import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

import '../widgets/sub_page_scaffold.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const _sections = [
    ('1. Introduction', 'GetGas Technologies Ltd is committed to protecting your personal information in compliance with Ghana\'s Data Protection Act, 2012 (Act 843).'),
    ('2. Information We Collect', 'We collect identity data, location data, transaction data, device data, and usage data. We do not store card numbers or mobile money PINs.'),
    ('3. How We Use Your Information', 'We use your data to manage your account, fulfil orders, assign riders, send notifications, process payments, and improve our services.'),
    ('4. Location Data', 'Location access is required to find stations, set delivery addresses, and enable rider tracking during active deliveries.'),
    ('5. Sharing Your Information', 'We share data with stations, riders, Paystack, and service providers as needed. We do not sell your personal data.'),
    ('6. Data Retention', 'Account data is retained while active. Order records are kept for regulatory compliance. Location data is deleted after order completion.'),
    ('7. Your Rights', 'You may access, correct, or request deletion of your data by contacting privacy@GetGas.com.gh.'),
    ('8. Security', 'We use encrypted transmission, JWT authentication, and access controls to protect your data.'),
  ];

  @override
  Widget build(BuildContext context) {
    return SubPageScaffold(
      title: 'Privacy Policy',
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
