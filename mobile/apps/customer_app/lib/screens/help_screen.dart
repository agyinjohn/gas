import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/sub_page_scaffold.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  String? _openKey;

  static const _contact = [
    (icon: Icons.phone, label: 'Call Us', value: '+233 24 123 4567', href: 'tel:+233241234567'),
    (icon: Icons.chat, label: 'WhatsApp', value: '+233 24 123 4567', href: 'https://wa.me/233241234567'),
    (icon: Icons.email_outlined, label: 'Email', value: 'support@GetGas.com.gh', href: 'mailto:support@GetGas.com.gh'),
  ];

  static const _faqs = [
    (
      category: 'Orders',
      icon: Icons.inventory_2_outlined,
      items: [
        ('How do I place an order?', 'Select a nearby station, choose your cylinder size, set your delivery location, and proceed to payment.'),
        ('How long does delivery take?', 'Most deliveries are completed within 30–60 minutes with real-time updates.'),
        ('Can I schedule a delivery?', 'Yes — during checkout select Schedule and pick your preferred time.'),
      ],
    ),
    (
      category: 'Payment',
      icon: Icons.credit_card,
      items: [
        ('What payment methods do you accept?', 'MTN MoMo, Vodafone Cash, cards via Paystack, and cash on delivery.'),
        ('Is my payment secure?', 'Yes — card and mobile money payments are processed through Paystack.'),
      ],
    ),
    (
      category: 'Delivery & Tracking',
      icon: Icons.location_on_outlined,
      items: [
        ('How do I track my delivery?', 'Tap Live Tracking from your order once a rider accepts.'),
        ('What is the delivery OTP?', 'Enter the 4-digit code from your rider to confirm delivery.'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SubPageScaffold(
      title: 'Help & Support',
      subtitle: 'We\'re here to help',
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: _contact.map((c) {
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: c == _contact.last ? 0 : 8),
                  child: Material(
                    color: GetGasColors.bgCard,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: () => launchUrl(Uri.parse(c.href)),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: GetGasColors.border),
                        ),
                        child: Column(
                          children: [
                            Icon(c.icon, color: GetGasColors.brand, size: 20),
                            const SizedBox(height: 6),
                            Text(c.label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                            Text(c.value, style: const TextStyle(fontSize: 9, color: GetGasColors.textMuted), textAlign: TextAlign.center),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          ..._faqs.map((section) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(section.icon, size: 18, color: GetGasColors.brand),
                      const SizedBox(width: 8),
                      Text(section.category, style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...section.items.map((item) {
                    final key = '${section.category}-${item.$1}';
                    final open = _openKey == key;
                    return Material(
                      color: GetGasColors.bgCard,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () => setState(() => _openKey = open ? null : key),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: GetGasColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                                  Icon(open ? Icons.expand_less : Icons.expand_more, size: 18, color: GetGasColors.textMuted),
                                ],
                              ),
                              if (open) ...[
                                const SizedBox(height: 8),
                                Text(item.$2, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
