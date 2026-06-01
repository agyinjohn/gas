import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

/// Order placed success — mirrors web `/user/order-success`.
class OrderSuccessScreen extends StatelessWidget {
  const OrderSuccessScreen({super.key, required this.params});

  final Map<String, String> params;

  @override
  Widget build(BuildContext context) {
    final orderId = params['orderId'] ?? params['id'] ?? '';
    final orderNumber = params['orderNumber'] ??
        (orderId.length >= 8 ? orderId.substring(orderId.length - 8).toUpperCase() : orderId.toUpperCase());
    final total = params['total'] ?? '';
    final method = params['method'] ?? 'cash';
    final summary = params['summary'] ?? '';
    final isCard = method == 'card' || method == 'paystack';

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Material(
                color: GetGasColors.bgCard,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: () => context.go('/'),
                  customBorder: const CircleBorder(),
                  child: const SizedBox(
                    width: 36,
                    height: 36,
                    child: Icon(Icons.arrow_back, size: 20),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: GetGasColors.brand.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.check_circle, size: 56, color: GetGasColors.brand.withValues(alpha: 0.9)),
                  ),
                  const SizedBox(height: 20),
                  const Text('Order Placed!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  const Text(
                    'A rider is heading to you for pickup',
                    style: TextStyle(color: GetGasColors.textMuted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: GetGasColors.border),
              ),
              child: Column(
                children: [
                  _row('Order', '#$orderNumber'),
                  if (summary.isNotEmpty) ...[
                    const Divider(height: 24),
                    _row('Items', summary),
                  ],
                  if (total.isNotEmpty) ...[
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Paid', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                        Text('GHS $total', style: const TextStyle(fontWeight: FontWeight.w900, color: GetGasColors.brand)),
                      ],
                    ),
                  ],
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: GetGasColors.bgCard2,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isCard ? 'Card / MoMo' : 'Cash on pickup',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'WHAT HAPPENS NEXT',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: GetGasColors.textMuted, letterSpacing: 1),
            ),
            const SizedBox(height: 12),
            _nextStep(Icons.schedule, 'A rider will be assigned and head to your location'),
            _nextStep(Icons.two_wheeler, 'Rider collects your cylinder from you for refilling'),
            _nextStep(Icons.location_on_outlined, 'Rider fills it at the station and delivers it back to you'),
            const SizedBox(height: 28),
            if (orderId.isNotEmpty)
              PrimaryButton(
                label: 'Track Order',
                showArrow: true,
                onPressed: () => context.go('/track/$orderId'),
              ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => context.go('/'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
                side: const BorderSide(color: GetGasColors.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Back to Home'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
        Flexible(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700), textAlign: TextAlign.right)),
      ],
    );
  }

  Widget _nextStep(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: GetGasColors.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: GetGasColors.brand),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted))),
        ],
      ),
    );
  }
}
