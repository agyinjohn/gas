import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/checkout_storage.dart';
import '../providers/api_providers.dart';
import '../widgets/checkout/checkout_page_header.dart';

/// Payment — mirrors web `/user/payment`.
class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key, required this.params});

  final Map<String, String> params;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  final _storage = CheckoutStorage();
  String _method = 'paystack';
  bool _loading = true;
  bool _submitting = false;
  List<CartItem> _cartItems = [];
  double _total = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCart());
  }

  Future<void> _loadCart() async {
    setState(() => _loading = true);
    var items = _parseCartItems(widget.params['cartItems']);
    if (items.isEmpty) {
      for (final key in [
        CheckoutStorage.quickOrderCartKey,
        CheckoutStorage.checkoutCartKey,
        CheckoutStorage.editOrderCartKey,
      ]) {
        items = await _storage.loadCart(key);
        if (items.isNotEmpty) break;
      }
    }
    if (!mounted) return;
    setState(() {
      _cartItems = items;
      _total = double.tryParse(widget.params['total'] ?? '') ??
          items.fold<double>(0, (s, i) => s + i.subtotal);
      _loading = false;
    });
  }

  List<CartItem> _parseCartItems(String? raw) {
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  String _effectiveStreet(String street, String label) {
    if (street.isNotEmpty && street != 'Current location') return street;
    return label;
  }

  String get _summaryLabel =>
      _cartItems.map((c) => '${c.size}kg ×${c.quantity}').join(', ');

  Future<void> _confirm() async {
    if (_cartItems.isEmpty || _submitting) return;

    final stationId = widget.params['stationId'] ?? '';
    if (stationId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Missing station. Go back and try again.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final pickupStreet = widget.params['pickupStreet'] ?? '';
      final pickupCity = widget.params['pickupCity'] ?? '';
      final pickupLat = double.tryParse(widget.params['pickupLat'] ?? '') ?? 0;
      final pickupLng = double.tryParse(widget.params['pickupLng'] ?? '') ?? 0;
      final pickupLabel = widget.params['pickupLabel'] ?? '';
      final deliveryStreet = widget.params['deliveryStreet'] ?? '';
      final deliveryCity = widget.params['deliveryCity'] ?? '';
      final deliveryLat = double.tryParse(widget.params['deliveryLat'] ?? '') ?? 0;
      final deliveryLng = double.tryParse(widget.params['deliveryLng'] ?? '') ?? 0;
      final deliveryLabel = widget.params['deliveryLabel'] ?? '';
      final schedule = widget.params['schedule'] ?? 'asap';
      final scheduledDate = widget.params['scheduledDate'] ?? '';

      final effectivePickup = _effectiveStreet(pickupStreet, pickupLabel);
      final effectiveDelivery = _effectiveStreet(deliveryStreet, deliveryLabel);

      final cylinders = _cartItems
          .map((c) => {
                'size': c.size,
                'quantity': c.quantity,
                if (c.unitPrice != 0) 'customPrice': c.unitPrice,
              })
          .toList();

      final result = await ref.read(ordersApiProvider).create(
            stationId: stationId,
            cylinders: cylinders,
            orderType: 'delivery',
            deliveryAddress: {
              'street': effectiveDelivery,
              'city': deliveryCity.isNotEmpty ? deliveryCity : effectiveDelivery,
              'lat': deliveryLat,
              'lng': deliveryLng,
            },
            pickupAddress: {
              'street': effectivePickup,
              'city': pickupCity.isNotEmpty ? pickupCity : effectivePickup,
              'lat': pickupLat,
              'lng': pickupLng,
            },
            paymentMethod: _method == 'paystack' ? 'card' : 'cash',
            scheduledFor: schedule == 'scheduled' && scheduledDate.isNotEmpty ? scheduledDate : null,
          );

      await _storage.savePhoto(null);
      for (final key in [
        CheckoutStorage.checkoutCartKey,
        CheckoutStorage.quickOrderCartKey,
        CheckoutStorage.editOrderCartKey,
      ]) {
        await _storage.clearCart(key);
      }

      if (!mounted) return;

      final orderId = result.order.id;
      final orderNumber = orderId.length >= 8
          ? orderId.substring(orderId.length - 8).toUpperCase()
          : orderId.toUpperCase();

      if (_method == 'paystack' && result.authorizationUrl != null && result.authorizationUrl!.isNotEmpty) {
        final uri = Uri.parse(result.authorizationUrl!);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }

      if (!mounted) return;

      final q = {
        'orderId': orderId,
        'orderNumber': orderNumber,
        'total': _total.toStringAsFixed(2),
        'method': _method == 'paystack' ? 'card' : 'cash',
        if (_summaryLabel.isNotEmpty) 'summary': _summaryLabel,
      };
      context.go('/order-success?${Uri(queryParameters: q).query}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: Column(
        children: [
          CheckoutPageHeader(title: 'Confirm & Pay', onBack: () => context.pop()),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: GetGasColors.brand))
                : _cartItems.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('No items in cart', textAlign: TextAlign.center),
                              const SizedBox(height: 16),
                              PrimaryButton(label: 'Back to home', onPressed: () => context.go('/')),
                            ],
                          ),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 120),
                        children: [
                          Center(
                            child: Column(
                              children: [
                                const Text('Total Amount', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                                const SizedBox(height: 4),
                                Text(
                                  'GHS ${_total.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
                                ),
                                if (_summaryLabel.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: GetGasColors.bgCard2,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: GetGasColors.border),
                                    ),
                                    child: Text(_summaryLabel, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 28),
                          const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 10),
                          _MethodTile(
                            icon: Icons.credit_card,
                            label: 'Mobile Money / Card',
                            subtitle: 'Pay securely with Paystack',
                            selected: _method == 'paystack',
                            onTap: () => setState(() => _method = 'paystack'),
                          ),
                          const SizedBox(height: 8),
                          _MethodTile(
                            icon: Icons.payments_outlined,
                            label: 'Cash on Delivery',
                            subtitle: 'Pay when your order arrives',
                            selected: _method == 'cash',
                            onTap: () => setState(() => _method = 'cash'),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Icon(Icons.shield_outlined, size: 16, color: GetGasColors.brand.withValues(alpha: 0.8)),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Payments are processed securely via Paystack',
                                  style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
          ),
        ],
      ),
      bottomNavigationBar: _cartItems.isEmpty
          ? null
          : Material(
              color: GetGasColors.bgCard,
              child: Container(
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: GetGasColors.border)),
                ),
                padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.paddingOf(context).bottom),
                child: PrimaryButton(
                  label: 'Place Order',
                  loading: _submitting,
                  showCheck: true,
                  onPressed: _submitting ? null : _confirm,
                ),
              ),
            ),
    );
  }
}

class _MethodTile extends StatelessWidget {
  const _MethodTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? GetGasColors.brand.withValues(alpha: 0.08) : GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: selected ? GetGasColors.brand : GetGasColors.border, width: selected ? 2 : 1),
          ),
          child: Row(
            children: [
              Icon(icon, color: selected ? GetGasColors.brand : GetGasColors.textMuted),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                  ],
                ),
              ),
              if (selected) const Icon(Icons.check_circle, color: GetGasColors.brand, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
