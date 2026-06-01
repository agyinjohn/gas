import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../providers/realtime_provider.dart';
import '../widgets/order_timeline.dart';
import '../widgets/sub_page_scaffold.dart';

/// Order detail — mirrors web `/user/orders/[id]` with OTP, rating, cancel.
class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _showOtp = false;
  bool _showRating = false;
  bool _showCancel = false;
  bool _showIssue = false;
  String _otp = '';
  int _rating = 5;
  final _ratingComment = TextEditingController();
  String _cancelReason = '';
  final _cancelOther = TextEditingController();
  String _issueCategory = 'not_delivered';
  final _issueDescription = TextEditingController();
  bool _submitting = false;

  static const _cancelReasons = [
    'I ordered by mistake',
    'I found a better price elsewhere',
    'Taking too long to find a rider',
    'I no longer need the gas',
    'Other',
  ];

  static const _issueCategories = [
    ('not_delivered', 'Order not delivered'),
    ('wrong_item', 'Wrong item or quantity'),
    ('late_delivery', 'Very late delivery'),
    ('rider_issue', 'Issue with rider'),
    ('payment_issue', 'Payment issue'),
    ('other', 'Other'),
  ];

  @override
  void dispose() {
    _ratingComment.dispose();
    _cancelOther.dispose();
    _issueDescription.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_orderDetailProvider(widget.orderId));
    final tracking = ref.watch(orderTrackingProvider(widget.orderId));

    ref.listen(orderTrackingProvider(widget.orderId), (prev, next) {
      final status = next.statusOverride;
      if (status == null) return;
      if (status == 'en_route' && !_showOtp) setState(() => _showOtp = true);
      if (status == 'delivered' && !_showRating) setState(() => _showRating = true);
      ref.invalidate(_orderDetailProvider(widget.orderId));
    });

    return Stack(
      children: [
        SubPageScaffold(
          title: 'Order Details',
          subtitle: orderAsync.valueOrNull != null ? '#${orderAsync.valueOrNull!.displayNumber}' : null,
          child: orderAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
            error: (_, __) => const Center(child: Text('Could not load order')),
            data: (order) {
              final status = tracking.statusOverride ?? order.status;
              if (status == 'en_route' && !_showOtp && order.riderRating == null) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_showOtp) setState(() => _showOtp = true);
                });
              }
              if (status == 'delivered' && order.riderRating == null && !_showRating) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && !_showRating) setState(() => _showRating = true);
                });
              }
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                children: [
                  _statusChip(status),
                  const SizedBox(height: 16),
                  _section('Timeline', OrderTimeline(status: status)),
                  if (order.isActive) ...[
                    const SizedBox(height: 16),
                    PrimaryButton(
                      label: 'Live Tracking',
                      showArrow: true,
                      onPressed: () => context.push('/track/${order.id}'),
                    ),
                  ],
                  const SizedBox(height: 16),
                  _section('Items', _itemsList(order)),
                  const SizedBox(height: 16),
                  _section('Delivery', _addressBlock(order)),
                  const SizedBox(height: 16),
                  _section('Payment', _paymentBlock(order)),
                  if (order.rider != null && order.rider!.name.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _section('Rider', _riderBlock(order.rider!)),
                  ],
                ],
              );
            },
          ),
        ),
        orderAsync.maybeWhen(
          data: (order) {
            if (order.status == 'cancelled') return const SizedBox.shrink();
            return _bottomBar(order);
          },
          orElse: () => const SizedBox.shrink(),
        ),
        if (_showOtp) _otpSheet(),
        if (_showRating) _ratingDialog(),
        if (_showCancel) _cancelDialog(),
        if (_showIssue) _issueSheet(),
      ],
    );
  }

  Widget _bottomBar(GasOrder order) {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Material(
        color: GetGasColors.bgCard,
        child: SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: GetGasColors.border)),
            ),
            child: Row(
              children: [
                if (order.status == 'pending')
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _showCancel = true),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: GetGasColors.error,
                        side: BorderSide(color: GetGasColors.error.withValues(alpha: 0.3)),
                      ),
                      child: const Text('Cancel', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                if (order.status == 'pending') const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _showIssue = true),
                    child: const Text('Report', style: TextStyle(fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: order.status == 'delivered' && order.riderRating == null
                        ? () => setState(() => _showRating = true)
                        : null,
                    child: Text(order.riderRating != null ? 'Rated' : 'Rate', style: const TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _otpSheet() {
    return _modalSheet(
      title: 'Confirm Delivery',
      onClose: () => setState(() => _showOtp = false),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Enter the 4-digit OTP from your rider to confirm delivery.',
            style: TextStyle(color: GetGasColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          OtpBoxes(
            value: _otp,
            onChanged: (v) => setState(() => _otp = v),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Confirm Delivery',
            loading: _submitting,
            onPressed: _otp.length == 4 ? _confirmDelivery : null,
          ),
        ],
      ),
    );
  }

  Widget _ratingDialog() {
    return _modalSheet(
      title: 'Rate your rider',
      onClose: () => setState(() => _showRating = false),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final star = i + 1;
              return IconButton(
                onPressed: () => setState(() => _rating = star),
                icon: Icon(
                  star <= _rating ? Icons.star : Icons.star_border,
                  color: Colors.amber,
                  size: 32,
                ),
              );
            }),
          ),
          TextField(
            controller: _ratingComment,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'Optional comment',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Submit Rating',
            loading: _submitting,
            onPressed: _submitRating,
          ),
        ],
      ),
    );
  }

  Widget _cancelDialog() {
    return _modalSheet(
      title: 'Cancel order?',
      onClose: () => setState(() => _showCancel = false),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Tell us why you\'re cancelling', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
          const SizedBox(height: 12),
          ..._cancelReasons.map((reason) {
            final selected = _cancelReason == reason;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton(
                onPressed: () => setState(() => _cancelReason = reason),
                style: OutlinedButton.styleFrom(
                  foregroundColor: selected ? GetGasColors.error : GetGasColors.text,
                  backgroundColor: selected ? GetGasColors.error.withValues(alpha: 0.08) : null,
                  side: BorderSide(color: selected ? GetGasColors.error : GetGasColors.border),
                  alignment: Alignment.centerLeft,
                ),
                child: Text(reason),
              ),
            );
          }),
          if (_cancelReason == 'Other')
            TextField(
              controller: _cancelOther,
              maxLines: 2,
              decoration: const InputDecoration(hintText: 'Describe your reason…', border: OutlineInputBorder()),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _showCancel = false),
                  child: const Text('Keep Order'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: PrimaryButton(
                  label: 'Yes, Cancel',
                  loading: _submitting,
                  onPressed: _cancelReason.isNotEmpty ? _cancelOrder : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _issueSheet() {
    return _modalSheet(
      title: 'Report an Issue',
      onClose: () => setState(() => _showIssue = false),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ..._issueCategories.map((cat) {
            final selected = _issueCategory == cat.$1;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton(
                onPressed: () => setState(() => _issueCategory = cat.$1),
                style: OutlinedButton.styleFrom(
                  foregroundColor: selected ? GetGasColors.brand : GetGasColors.text,
                  backgroundColor: selected ? GetGasColors.brand.withValues(alpha: 0.08) : null,
                  side: BorderSide(color: selected ? GetGasColors.brand : GetGasColors.border),
                  alignment: Alignment.centerLeft,
                ),
                child: Text(cat.$2),
              ),
            );
          }),
          TextField(
            controller: _issueDescription,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Describe the issue (min 10 characters)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Submit Report',
            loading: _submitting,
            onPressed: _submitIssue,
          ),
        ],
      ),
    );
  }

  Widget _modalSheet({
    required String title,
    required VoidCallback onClose,
    required Widget child,
  }) {
    return Positioned.fill(
      child: Material(
        color: Colors.black54,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: GetGasColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
                      IconButton(onPressed: onClose, icon: const Icon(Icons.close, size: 20)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelivery() async {
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).confirmDelivery(widget.orderId, _otp);
      if (!mounted) return;
      setState(() {
        _showOtp = false;
        _showRating = true;
        _otp = '';
      });
      ref.invalidate(_orderDetailProvider(widget.orderId));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitRating() async {
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).rate(
            widget.orderId,
            _rating,
            comment: _ratingComment.text.trim(),
          );
      if (!mounted) return;
      setState(() => _showRating = false);
      ref.invalidate(_orderDetailProvider(widget.orderId));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks for your rating!')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancelOrder() async {
    final reason = _cancelReason == 'Other' ? _cancelOther.text.trim() : _cancelReason;
    if (_cancelReason == 'Other' && reason.length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe your reason')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).updateStatus(widget.orderId, 'cancelled', note: reason);
      if (!mounted) return;
      setState(() => _showCancel = false);
      ref.invalidate(_orderDetailProvider(widget.orderId));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order cancelled')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitIssue() async {
    final desc = _issueDescription.text.trim();
    if (desc.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe the issue (min 10 characters)')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).reportIssue(widget.orderId, _issueCategory, desc);
      if (!mounted) return;
      setState(() => _showIssue = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Issue reported')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _statusChip(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: GetGasColors.brand.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(orderStatusLabel(status), style: const TextStyle(fontWeight: FontWeight.w700, color: GetGasColors.brand)),
    );
  }

  Widget _section(String title, Widget child) {
    return Container(
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
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _itemsList(GasOrder order) {
    if (order.cylinders.isEmpty) {
      return const Text('No items', style: TextStyle(color: GetGasColors.textMuted));
    }
    return Column(
      children: order.cylinders.map((c) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${c.size}kg × ${c.quantity}'),
              Text('GHS ${c.subtotal.toStringAsFixed(2)}'),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _addressBlock(GasOrder order) {
    final addr = order.deliveryAddress;
    if (addr == null || addr.street.isEmpty) {
      return const Text('—', style: TextStyle(color: GetGasColors.textMuted));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(addr.street, style: const TextStyle(fontWeight: FontWeight.w600)),
        if (addr.city.isNotEmpty) Text(addr.city, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
        if (order.station != null) ...[
          const SizedBox(height: 12),
          const Text('Station', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
          Text(order.station!.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ],
    );
  }

  Widget _paymentBlock(GasOrder order) {
    return Column(
      children: [
        _infoRow('Method', paymentMethodLabel(order.paymentMethod)),
        _infoRow('Total', 'GHS ${order.displayTotal}'),
        if (order.deliveryFee != null) _infoRow('Delivery fee', 'GHS ${order.deliveryFee}'),
      ],
    );
  }

  Widget _riderBlock(OrderRider rider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(rider.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        if (rider.phone.isNotEmpty)
          Text(rider.phone, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
      ],
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}

final _orderDetailProvider = FutureProvider.family<GasOrder, String>((ref, id) {
  return ref.watch(ordersApiProvider).getById(id);
});
