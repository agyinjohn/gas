import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../data/checkout_storage.dart';
import '../providers/api_providers.dart';
import '../providers/location_provider.dart';
import '../widgets/checkout/checkout_page_header.dart';

/// Review order — mirrors web `/user/checkout/review`.
class CheckoutReviewScreen extends ConsumerStatefulWidget {
  const CheckoutReviewScreen({super.key, required this.params});

  final Map<String, String> params;

  @override
  ConsumerState<CheckoutReviewScreen> createState() => _CheckoutReviewScreenState();
}

class _CheckoutReviewScreenState extends ConsumerState<CheckoutReviewScreen> {
  final _storage = CheckoutStorage();
  List<CartItem> _cartItems = [];
  String? _photoBase64;
  double _deliveryFee = 0;
  bool _loaded = false;

  bool get _isQuickOrder =>
      widget.params['isQuickOrder'] == 'true' || widget.params['source'] == 'quick';

  @override
  void initState() {
    super.initState();
    _deliveryFee = double.tryParse(widget.params['deliveryFee'] ?? '') ?? 0;
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    var items = await _storage.loadCart(CheckoutStorage.editOrderCartKey);
    if (items.isEmpty) items = await _storage.loadCart(CheckoutStorage.checkoutCartKey);
    if (items.isEmpty) items = await _storage.loadCart(CheckoutStorage.quickOrderCartKey);

    _photoBase64 = await _storage.loadPhoto();

    if (mounted) {
      setState(() {
        _cartItems = items;
        _loaded = true;
      });
    }

    _recalcDeliveryFee();
  }

  Future<void> _recalcDeliveryFee() async {
    try {
      final pricing = await ref.read(stationsApiProvider).getPricing();
      final pickupLat = double.tryParse(widget.params['pickupLat'] ?? '');
      final pickupLng = double.tryParse(widget.params['pickupLng'] ?? '');
      final stationLat = double.tryParse(widget.params['stationLat'] ?? '');
      final stationLng = double.tryParse(widget.params['stationLng'] ?? '');
      if (pickupLat == null || pickupLng == null || stationLat == null || stationLng == null) return;

      final fee = calcDeliveryFeeFromCoords(
        userLat: pickupLat,
        userLng: pickupLng,
        stationLat: stationLat,
        stationLng: stationLng,
        config: pricing,
      );
      if (mounted) setState(() => _deliveryFee = fee);
    } catch (_) {}
  }

  double get _subtotalFromParams => double.tryParse(widget.params['subtotal'] ?? '') ?? 0;
  double get _calculatedSubtotal => _cartItems.fold(0, (a, b) => a + b.subtotal);
  double get _finalSubtotal => _subtotalFromParams > 0 ? _subtotalFromParams : _calculatedSubtotal;
  double get _total => _finalSubtotal + _deliveryFee;

  ({String title, String subtitle}) _resolveLocation(String label, String street, String city) {
    if (label == 'Current location' || (street.isEmpty && city.isEmpty)) {
      final loc = ref.read(locationProvider);
      return (
        title: 'Current location',
        subtitle: loc.address.isNotEmpty ? loc.address : loc.label,
      );
    }
    return (
      title: label.isNotEmpty ? label : (street.isNotEmpty ? street : 'Location'),
      subtitle: [street, city].where((s) => s.isNotEmpty).join(', '),
    );
  }

  void _edit() async {
    await _storage.saveCart(CheckoutStorage.editOrderCartKey, _cartItems);
    final q = Map<String, String>.from(widget.params)..['fromReview'] = 'true';
    q.remove('subtotal');
    q.remove('deliveryFee');
    if (!mounted) return;
    context.push('/checkout?${Uri(queryParameters: q).query}');
  }

  void _proceed() {
    final q = Map<String, String>.from(widget.params);
    q['cartItems'] = jsonEncode(_cartItems.map((e) => e.toJson()).toList());
    q['subtotal'] = _finalSubtotal.toStringAsFixed(2);
    q['deliveryFee'] = _deliveryFee.toStringAsFixed(2);
    q['total'] = _total.toStringAsFixed(2);
    context.push('/payment?${Uri(queryParameters: q).query}');
  }

  @override
  Widget build(BuildContext context) {
    final pickup = _resolveLocation(
      widget.params['pickupLabel'] ?? '',
      widget.params['pickupStreet'] ?? '',
      widget.params['pickupCity'] ?? '',
    );
    final delivery = _resolveLocation(
      widget.params['deliveryLabel'] ?? '',
      widget.params['deliveryStreet'] ?? '',
      widget.params['deliveryCity'] ?? '',
    );

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: Column(
        children: [
          CheckoutPageHeader(
            title: 'Review Order',
            onBack: () {
              if (_isQuickOrder) {
                context.go('/');
              } else {
                context.pop();
              }
            },
          ),
          Expanded(
            child: !_loaded
                ? const Center(child: CircularProgressIndicator(color: GetGasColors.brand))
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
                    children: [
                      _orderDetailsCard(),
                      const SizedBox(height: 16),
                      _deliveryInfoCard(pickup, delivery),
                      const SizedBox(height: 16),
                      _promoCard(),
                      const SizedBox(height: 16),
                      _paymentBreakdown(),
                    ],
                  ),
          ),
        ],
      ),
      bottomNavigationBar: Material(
        color: GetGasColors.bgCard,
        child: Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: GetGasColors.border)),
          ),
          padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.paddingOf(context).bottom),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _cartItems.isEmpty ? null : _proceed,
              style: ElevatedButton.styleFrom(
                backgroundColor: GetGasColors.brand,
                foregroundColor: Colors.white,
                disabledBackgroundColor: GetGasColors.brand.withValues(alpha: 0.4),
                disabledForegroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Proceed to payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _orderDetailsCard() {
    return Container(
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                const Expanded(child: Text('Order Details', style: TextStyle(fontWeight: FontWeight.w700))),
                TextButton(onPressed: _edit, child: const Text('Edit', style: TextStyle(color: GetGasColors.brand, fontWeight: FontWeight.w600))),
              ],
            ),
          ),
          if (_photoBase64 != null)
            Image.memory(base64Decode(_photoBase64!), height: 192, width: double.infinity, fit: BoxFit.cover)
          else
            Container(
              height: 128,
              color: GetGasColors.bgCard2,
              alignment: Alignment.center,
              child: Icon(Icons.propane_tank_outlined, size: 64, color: GetGasColors.textMuted.withValues(alpha: 0.4)),
            ),
          if (_cartItems.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: Text('No items in cart', style: TextStyle(color: GetGasColors.textMuted))),
            )
          else
            ..._cartItems.map((item) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: GetGasColors.border)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: GetGasColors.brand.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.propane_tank, color: GetGasColors.brand, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('LPG Refill', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            Text('${item.size}kg Cylinder', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                            Text('Qty: ${item.quantity}', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                          ],
                        ),
                      ),
                      Text('GHS ${item.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, color: GetGasColors.brand)),
                    ],
                  ),
                )),
        ],
      ),
    );
  }

  Widget _deliveryInfoCard(({String title, String subtitle}) pickup, ({String title, String subtitle}) delivery) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(child: Text('Delivery Info', style: TextStyle(fontWeight: FontWeight.w700))),
              TextButton(onPressed: _edit, child: const Text('Edit', style: TextStyle(color: GetGasColors.brand, fontWeight: FontWeight.w600))),
            ],
          ),
          const SizedBox(height: 12),
          _locBlock('Pickup Location', pickup.title, pickup.subtitle),
          const Divider(height: 24),
          _locBlock('Delivery Location', delivery.title, delivery.subtitle),
          const Divider(height: 24),
          const Text('Station', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
          const SizedBox(height: 4),
          Text(widget.params['stationName'] ?? 'Station', style: const TextStyle(fontWeight: FontWeight.w600)),
          if ((widget.params['stationAddress'] ?? '').isNotEmpty)
            Text(widget.params['stationAddress']!, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
          if (widget.params['schedule'] == 'scheduled' && (widget.params['scheduledDate'] ?? '').isNotEmpty) ...[
            const Divider(height: 24),
            const Text('Scheduled For', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
            Text(DateTime.tryParse(widget.params['scheduledDate']!)?.toLocal().toString() ?? widget.params['scheduledDate']!),
          ],
        ],
      ),
    );
  }

  Widget _locBlock(String label, String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
        const SizedBox(height: 4),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        if (subtitle.isNotEmpty) Text(subtitle, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
      ],
    );
  }

  Widget _promoCard() {
    return Opacity(
      opacity: 0.5,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: GetGasColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.local_offer_outlined, size: 18, color: GetGasColors.textMuted),
            ),
            const SizedBox(width: 12),
            const Expanded(child: Text('Add promo code', style: TextStyle(color: GetGasColors.textMuted))),
            const Text('Apply', style: TextStyle(fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _paymentBreakdown() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Payment Breakdown', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          _row('Subtotal', 'GHS ${_finalSubtotal.toStringAsFixed(2)}'),
          _row('Delivery Fee', 'GHS ${_deliveryFee.toStringAsFixed(2)}', divider: true),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total amount to pay', style: TextStyle(fontWeight: FontWeight.w700)),
              Text('GHS ${_total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: GetGasColors.brand)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {bool divider = false}) {
    return Padding(
      padding: EdgeInsets.only(bottom: divider ? 12 : 8),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: GetGasColors.textMuted)),
              Text(value, style: const TextStyle(color: GetGasColors.textMuted)),
            ],
          ),
          if (divider) const Divider(height: 16),
        ],
      ),
    );
  }
}
