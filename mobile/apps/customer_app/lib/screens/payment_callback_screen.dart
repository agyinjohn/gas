import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';

class PaymentCallbackScreen extends ConsumerStatefulWidget {
  const PaymentCallbackScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<PaymentCallbackScreen> createState() => _PaymentCallbackScreenState();
}

class _PaymentCallbackScreenState extends ConsumerState<PaymentCallbackScreen> {
  static const _maxPolls = 12;
  static const _pollInterval = Duration(milliseconds: 2500);

  _State _state = _State.polling;
  int _pollCount = 0;
  Timer? _timer;
  bool _retryLoading = false;

  @override
  void initState() {
    super.initState();
    _poll();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    if (widget.orderId.isEmpty) {
      setState(() => _state = _State.failed);
      return;
    }

    try {
      final order = await ref.read(ordersApiProvider).getById(widget.orderId);

      if (order.status != 'awaiting_payment') {
        if (!mounted) return;
        setState(() => _state = _State.confirmed);
        await Future.delayed(const Duration(milliseconds: 1200));
        if (!mounted) return;
        final orderNumber = order.id.length >= 8
            ? order.id.substring(order.id.length - 8).toUpperCase()
            : order.id.toUpperCase();
        context.go('/order-success?orderId=${order.id}&orderNumber=$orderNumber'
            '&total=${order.totalAmount?.toStringAsFixed(2) ?? ''}'
            '&method=${order.paymentMethod}');
        return;
      }
    } catch (_) {
      // network error — keep polling
    }

    _pollCount++;
    if (_pollCount < _maxPolls && mounted) {
      _timer = Timer(_pollInterval, _poll);
    } else if (mounted) {
      setState(() => _state = _State.failed);
    }
  }

  Future<void> _retryPayment() async {
    setState(() => _retryLoading = true);
    try {
      final result = await ref.read(paymentsApiProvider).retry(widget.orderId);
      final url = result['payment']?['authorizationUrl'] as String?;
      if (url != null && url.isNotEmpty) {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
        if (!mounted) return;
        // Reset and repoll after user returns from Paystack
        setState(() {
          _retryLoading = false;
          _state = _State.polling;
          _pollCount = 0;
        });
        _poll();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _retryLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: switch (_state) {
              _State.polling   => _PollingView(),
              _State.confirmed => _ConfirmedView(),
              _State.failed    => _FailedView(
                  retryLoading: _retryLoading,
                  onRetry: _retryPayment,
                  onHome: () => context.go('/'),
                ),
            },
          ),
        ),
      ),
    );
  }
}

enum _State { polling, confirmed, failed }

class _PollingView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: GetGasColors.brand.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const CircularProgressIndicator(color: GetGasColors.brand, strokeWidth: 3),
        ),
        const SizedBox(height: 24),
        const Text(
          'Confirming Payment',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Please wait, this usually takes a few seconds…',
          textAlign: TextAlign.center,
          style: TextStyle(color: GetGasColors.textMuted),
        ),
      ],
    );
  }
}

class _ConfirmedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: GetGasColors.brand.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check_circle_outline, color: GetGasColors.brand, size: 44),
        ),
        const SizedBox(height: 24),
        const Text(
          'Payment Confirmed!',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Redirecting you now…',
          style: TextStyle(color: GetGasColors.textMuted),
        ),
      ],
    );
  }
}

class _FailedView extends StatelessWidget {
  const _FailedView({
    required this.retryLoading,
    required this.onRetry,
    required this.onHome,
  });

  final bool retryLoading;
  final VoidCallback onRetry;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: GetGasColors.error.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.cancel_outlined, color: GetGasColors.error, size: 44),
        ),
        const SizedBox(height: 24),
        const Text(
          'Payment Failed',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text(
          'Your order is saved. You can try paying again without losing your order.',
          textAlign: TextAlign.center,
          style: TextStyle(color: GetGasColors.textMuted),
        ),
        const SizedBox(height: 32),
        PrimaryButton(
          label: 'Try Payment Again',
          loading: retryLoading,
          onPressed: retryLoading ? null : onRetry,
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: onHome,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
            side: const BorderSide(color: GetGasColors.border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Back to Home'),
        ),
      ],
    );
  }
}
