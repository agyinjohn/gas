import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/api_providers.dart';
import '../providers/realtime_provider.dart';
import '../widgets/google_map_location_picker.dart';
import '../widgets/order_timeline.dart';
import '../widgets/sub_page_scaffold.dart';

const _activeStatuses = {'pending', 'accepted', 'at_station', 'en_route'};

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _showRating = false;
  bool _showCancel = false;
  bool _showIssue  = false;
  int _rating = 5;
  final _ratingComment  = TextEditingController();
  String _cancelReason  = '';
  final _cancelOther    = TextEditingController();
  String _issueCategory = 'not_delivered';
  final _issueDesc      = TextEditingController();
  bool _submitting  = false;
  bool _payLoading  = false;
  bool _liveTransition = false;

  static const _cancelReasons = [
    'I ordered by mistake',
    'I found a better price elsewhere',
    'Taking too long to find a rider',
    'I no longer need the gas',
    'Other',
  ];

  static const _issueCategories = [
    ('not_delivered', 'Order not delivered'),
    ('wrong_item',    'Wrong item or quantity'),
    ('late_delivery', 'Very late delivery'),
    ('rider_issue',   'Issue with rider'),
    ('payment_issue', 'Payment issue'),
    ('other',         'Other'),
  ];

  @override
  void dispose() {
    _ratingComment.dispose();
    _cancelOther.dispose();
    _issueDesc.dispose();
    super.dispose();
  }

  // ── Status helpers ─────────────────────────────────────────────────────────

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(_orderDetailProvider(widget.orderId));
    final tracking   = ref.watch(orderTrackingProvider(widget.orderId));

    ref.listen(orderTrackingProvider(widget.orderId), (_, next) {
      final s = next.statusOverride;
      if (s == null) return;
      // Only auto-show sheets for live real-time transitions
      _liveTransition = true;
      if (s == 'delivered' && !_showRating) setState(() => _showRating = true);
      ref.invalidate(_orderDetailProvider(widget.orderId));
    });

    return Stack(
      children: [
        SubPageScaffold(
          title: 'Order Details',
          subtitle: orderAsync.valueOrNull != null
              ? '#${orderAsync.valueOrNull!.displayNumber}'
              : null,
          child: orderAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
            error:   (_, __) => const Center(child: Text('Could not load order')),
            data: (order) {
              final status = tracking.statusOverride ?? order.status;

              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) return;
                // Only auto-trigger OTP/rating sheets on live real-time transitions
                if (!_liveTransition) return;
                if (status == 'delivered' && !_showRating && order.riderRating == null) setState(() => _showRating = true);
              });

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                children: [
                  // 1. Status pill
                  _StatusPill(status: status),
                  const SizedBox(height: 16),

                  // 2. Awaiting payment banner (highest priority action)
                  if (status == 'awaiting_payment') ...[
                    _ActionBanner(
                      icon: Icons.payment_outlined,
                      iconColor: const Color(0xFFF59E0B),
                      iconBg: const Color(0xFFFEF3C7),
                      title: 'Payment Pending',
                      subtitle: 'Complete your payment to confirm this order.',
                      actionLabel: 'Pay Now',
                      loading: _payLoading,
                      onAction: _completePayment,
                      borderColor: const Color(0xFFF59E0B),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 3. Live map (active orders)
                  if (_activeStatuses.contains(status)) ...[
                    _LiveMapCard(
                      order: order,
                      tracking: tracking,
                      onExpand: () => context.push('/track/${order.id}'),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 4. OTP display card (cash: accepted, online: en_route)
                  if ((order.paymentMethod == 'cash' && status == 'accepted') ||
                      (order.paymentMethod != 'cash' && status == 'en_route')) ...[
                    if (order.otpCode != null)
                      _OtpDisplayCard(otp: order.otpCode!)
                    else
                      _OtpSmsBanner(),
                    const SizedBox(height: 16),
                  ],

                  // 5. Rider card (when assigned)
                  if (order.rider != null && order.rider!.name.isNotEmpty &&
                      ['accepted', 'at_station', 'en_route', 'delivered'].contains(status)) ...[
                    _RiderCard(rider: order.rider!),
                    const SizedBox(height: 16),
                  ],

                  // 6. Timeline
                  _SectionCard(
                    label: 'Order Progress',
                    child: OrderTimeline(status: status),
                  ),
                  const SizedBox(height: 16),

                  // 7. Items
                  _SectionCard(
                    label: 'Items',
                    child: _ItemsList(order: order),
                  ),
                  const SizedBox(height: 16),

                  // 8. Delivery info
                  _SectionCard(
                    label: 'Delivery',
                    child: _DeliveryBlock(order: order),
                  ),
                  const SizedBox(height: 16),

                  // 9. Payment
                  _SectionCard(
                    label: 'Payment',
                    child: _PaymentBlock(order: order),
                  ),
                ],
              );
            },
          ),
        ),

        // Bottom bar
        orderAsync.maybeWhen(
          data: (order) {
            if (order.status == 'cancelled') return const SizedBox.shrink();
            return _BottomBar(
              order: order,
              payLoading: _payLoading,
              submitting: _submitting,
              onPay:    _completePayment,
              onCancel: () => setState(() => _showCancel = true),
              onReport: () => setState(() => _showIssue  = true),
              onRate:   () => setState(() => _showRating = true),
            );
          },
          orElse: () => const SizedBox.shrink(),
        ),

        if (_showRating) _ratingDialog(),
        if (_showCancel) _cancelDialog(),
        if (_showIssue)  _issueSheet(),
      ],
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  Future<void> _completePayment() async {
    setState(() => _payLoading = true);
    try {
      final result = await ref.read(paymentsApiProvider).retry(widget.orderId);
      final url = result['payment']?['authorizationUrl'] as String?;
      if (url != null && url.isNotEmpty) {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (!mounted) return;
        context.push('/payment/callback?orderId=${widget.orderId}');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _payLoading = false);
    }
  }

  Future<void> _submitRating() async {
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).rate(widget.orderId, _rating, comment: _ratingComment.text.trim());
      if (!mounted) return;
      setState(() => _showRating = false);
      ref.invalidate(_orderDetailProvider(widget.orderId));
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks for your rating!')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancelOrder() async {
    final reason = _cancelReason == 'Other' ? _cancelOther.text.trim() : _cancelReason;
    if (_cancelReason == 'Other' && reason.length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please describe your reason')));
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
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _submitIssue() async {
    final desc = _issueDesc.text.trim();
    if (desc.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Describe the issue (min 10 characters)')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(ordersApiProvider).reportIssue(widget.orderId, _issueCategory, desc);
      if (!mounted) return;
      setState(() => _showIssue = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Issue reported')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ── Overlays ───────────────────────────────────────────────────────────────


  Widget _ratingDialog() => _Modal(
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
              icon: Icon(star <= _rating ? Icons.star : Icons.star_border, color: Colors.amber, size: 34),
            );
          }),
        ),
        Text(
          ['', 'Very Poor', 'Poor', 'Okay', 'Good', 'Excellent!'][_rating],
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _ratingComment,
          maxLines: 2,
          decoration: InputDecoration(
            hintText: 'Leave a comment… (optional)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        PrimaryButton(label: 'Submit Rating', loading: _submitting, onPressed: _submitRating),
      ],
    ),
  );

  Widget _cancelDialog() => _Modal(
    title: 'Cancel order?',
    onClose: () => setState(() => _showCancel = false),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Tell us why you\'re cancelling', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
        const SizedBox(height: 10),
        ..._cancelReasons.map((reason) {
          final sel = _cancelReason == reason;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ChoiceButton(
              label: reason,
              selected: sel,
              errorColor: true,
              onTap: () => setState(() => _cancelReason = reason),
            ),
          );
        }),
        if (_cancelReason == 'Other') ...[
          TextField(
            controller: _cancelOther,
            maxLines: 2,
            decoration: InputDecoration(hintText: 'Describe your reason…', border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
          ),
          const SizedBox(height: 8),
        ],
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _showCancel = false),
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
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

  Widget _issueSheet() => _Modal(
    title: 'Report an Issue',
    onClose: () => setState(() => _showIssue = false),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ..._issueCategories.map((cat) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _ChoiceButton(
            label: cat.$2,
            selected: _issueCategory == cat.$1,
            onTap: () => setState(() => _issueCategory = cat.$1),
          ),
        )),
        TextField(
          controller: _issueDesc,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Describe the issue (min 10 characters)',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        PrimaryButton(label: 'Submit Report', loading: _submitting, onPressed: _submitIssue),
      ],
    ),
  );
}

// ── Reusable widgets ──────────────────────────────────────────────────────────

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final String status;

  static const _meta = {
    'awaiting_payment': (label: 'Awaiting Payment', color: Color(0xFFF59E0B),  bg: Color(0xFFFEF3C7)),
    'pending':          (label: 'Order Placed',     color: Color(0xFFF59E0B),  bg: Color(0xFFFEF3C7)),
    'accepted':         (label: 'Rider Assigned',   color: Color(0xFF3B82F6),  bg: Color(0xFFEFF6FF)),
    'at_station':       (label: 'At Station',       color: Color(0xFF8B5CF6),  bg: Color(0xFFF5F3FF)),
    'en_route':         (label: 'On the Way',       color: GetGasColors.brand, bg: Color(0xFFE8F5E9)),
    'delivered':        (label: 'Delivered',        color: Color(0xFF16A34A),  bg: Color(0xFFDCFCE7)),
    'cancelled':        (label: 'Cancelled',        color: GetGasColors.error, bg: GetGasColors.errorBg),
  };

  @override
  Widget build(BuildContext context) {
    final m = _meta[status];
    final label = m?.label ?? orderStatusLabel(status);
    final color = m?.color ?? GetGasColors.textMuted;
    final bg    = m?.bg    ?? GetGasColors.bgCard2;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
      ),
    );
  }
}

class _ActionBanner extends StatelessWidget {
  const _ActionBanner({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.loading,
    required this.onAction,
    required this.borderColor,
  });

  final IconData icon;
  final Color iconColor, iconBg, borderColor;
  final String title, subtitle, actionLabel;
  final bool loading;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: iconBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 38, height: 38,
            decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.15), shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: iconColor)),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: GetGasColors.brand, strokeWidth: 2))
              : GestureDetector(
                  onTap: onAction,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(color: iconColor, borderRadius: BorderRadius.circular(10)),
                    child: Text(actionLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
        ],
      ),
    );
  }
}

class _LiveMapCard extends StatelessWidget {
  const _LiveMapCard({
    required this.order,
    required this.tracking,
    required this.onExpand,
  });

  final GasOrder order;
  final OrderTrackingState tracking;
  final VoidCallback onExpand;

  @override
  Widget build(BuildContext context) {
    final addr = order.deliveryAddress;
    final riderLat = tracking.riderLat ?? order.rider?.location?.lat;
    final riderLng = tracking.riderLng ?? order.rider?.location?.lng;
    final isPending = order.status == 'pending';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Finding rider indicator — only while pending
        if (isPending) ...[
          _FindingRiderBanner(),
          const SizedBox(height: 12),
        ],

        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              SizedBox(
                height: 200,
                child: GoogleTrackMapView(
                  riderLat: riderLat,
                  riderLng: riderLng,
                  deliveryLat: addr?.lat,
                  deliveryLng: addr?.lng,
                ),
              ),
              Positioned(
                bottom: 10,
                right: 10,
                child: GestureDetector(
                  onTap: onExpand,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 6, offset: Offset(0, 2))],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.fullscreen, size: 14, color: Color(0xFF1A1A1A)),
                        SizedBox(width: 4),
                        Text('Full tracker', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1A1A1A))),
                      ],
                    ),
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

// Ripple + pulsing bar — mirrors track_screen's finding-rider animation
class _FindingRiderBanner extends StatefulWidget {
  @override
  State<_FindingRiderBanner> createState() => _FindingRiderBannerState();
}

class _FindingRiderBannerState extends State<_FindingRiderBanner>
    with TickerProviderStateMixin {
  late final AnimationController _ring1;
  late final AnimationController _ring2;
  late final AnimationController _ring3;
  late final AnimationController _bar;
  late final Animation<double> _barAnim;

  @override
  void initState() {
    super.initState();
    _ring1 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat();
    _ring2 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
      ..forward(from: 0.33)
      ..addStatusListener((s) { if (s == AnimationStatus.completed) _ring2.repeat(); });
    _ring3 = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
      ..forward(from: 0.66)
      ..addStatusListener((s) { if (s == AnimationStatus.completed) _ring3.repeat(); });
    _bar = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _barAnim = Tween<double>(begin: 0.3, end: 0.85).animate(CurvedAnimation(parent: _bar, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ring1.dispose(); _ring2.dispose(); _ring3.dispose(); _bar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              SizedBox(
                width: 48, height: 48,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    _Ring(ctrl: _ring1, size: 48),
                    _Ring(ctrl: _ring2, size: 48),
                    _Ring(ctrl: _ring3, size: 48),
                    Container(
                      width: 34, height: 34,
                      decoration: const BoxDecoration(color: GetGasColors.brand, shape: BoxShape.circle),
                      child: const Icon(Icons.two_wheeler_outlined, color: Colors.white, size: 16),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Finding your rider', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                    SizedBox(height: 2),
                    Text('This may take a few minutes', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AnimatedBuilder(
            animation: _barAnim,
            builder: (_, __) => ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _barAnim.value,
                backgroundColor: GetGasColors.bgCard2,
                valueColor: const AlwaysStoppedAnimation<Color>(GetGasColors.brand),
                minHeight: 5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Ring extends AnimatedWidget {
  const _Ring({required AnimationController ctrl, required this.size}) : super(listenable: ctrl);
  final double size;

  @override
  Widget build(BuildContext context) {
    final v = (listenable as AnimationController).value;
    return Opacity(
      opacity: (1.0 - v).clamp(0.0, 1.0),
      child: Container(
        width: size * v, height: size * v,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: GetGasColors.brand, width: 2),
        ),
      ),
    );
  }
}



// ── OTP display card ──────────────────────────────────────────────────────────

class _OtpDisplayCard extends StatelessWidget {
  const _OtpDisplayCard({required this.otp});
  final String otp;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.brand.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.brand, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.lock_outline_rounded, size: 16, color: GetGasColors.brand),
              SizedBox(width: 6),
              Text(
                'YOUR CONFIRMATION CODE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                    color: GetGasColors.brand, letterSpacing: 0.8),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: otp.split('').map((digit) => Container(
              width: 52, height: 60,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: GetGasColors.brand, width: 2),
                boxShadow: [BoxShadow(color: GetGasColors.brand.withValues(alpha: 0.12), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              alignment: Alignment.center,
              child: Text(digit,
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: GetGasColors.brand)),
            )).toList(),
          ),
          const SizedBox(height: 12),
          const Text(
            'Show this code to your rider to confirm.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _OtpSmsBanner extends StatelessWidget {
  const _OtpSmsBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: const Row(
        children: [
          Icon(Icons.sms_outlined, size: 18, color: GetGasColors.brand),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Your confirmation code was sent via SMS. Share it with your rider.',
              style: TextStyle(fontSize: 13, color: GetGasColors.textMuted),
            ),
          ),
        ],
      ),
    );
  }
}

class _RiderCard extends StatelessWidget {
  const _RiderCard({required this.rider});
  final OrderRider rider;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header label ──
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.two_wheeler_outlined, size: 13, color: GetGasColors.brand),
                    SizedBox(width: 4),
                    Text(
                      'Your Delivery Rider',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: GetGasColors.brand),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // ── Rider info + call button ──
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: GetGasColors.brand.withValues(alpha: 0.15),
                child: Text(
                  rider.name.isNotEmpty ? rider.name[0].toUpperCase() : '?',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: GetGasColors.brand),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(rider.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    if (rider.phone.isNotEmpty)
                      Text(rider.phone, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                  ],
                ),
              ),
              if (rider.phone.isNotEmpty)
                Material(
                  color: GetGasColors.brand,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: () => launchUrl(Uri.parse('tel:${rider.phone}')),
                    customBorder: const CircleBorder(),
                    child: const SizedBox(width: 42, height: 42, child: Icon(Icons.phone, color: Colors.white, size: 18)),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
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
          Text(label.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: GetGasColors.textMuted, letterSpacing: 0.8)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _ItemsList extends StatelessWidget {
  const _ItemsList({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    if (order.cylinders.isEmpty) return const Text('—', style: TextStyle(color: GetGasColors.textMuted));
    return Column(
      children: [
        ...order.cylinders.map((c) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.local_fire_department_rounded, size: 16, color: GetGasColors.brand),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text('${c.size}kg cylinder × ${c.quantity}', style: const TextStyle(fontSize: 14))),
              Text('GHS ${c.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            ],
          ),
        )),
        const Divider(height: 16, color: GetGasColors.border),
        if (order.deliveryFee != null)
          _Row('Delivery fee', 'GHS ${order.deliveryFee}'),
        _Row('Total', 'GHS ${order.displayTotal}', bold: true, valueColor: GetGasColors.brand),
      ],
    );
  }
}

class _DeliveryBlock extends StatelessWidget {
  const _DeliveryBlock({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    final addr = order.deliveryAddress;
    return Column(
      children: [
        if (addr != null && addr.street.isNotEmpty)
          _Row('Deliver to', '${addr.street}${addr.city.isNotEmpty ? ', ${addr.city}' : ''}'),
        if (order.station != null)
          _Row('Station', order.station!.name),
      ],
    );
  }
}

class _PaymentBlock extends StatelessWidget {
  const _PaymentBlock({required this.order});
  final GasOrder order;

  @override
  Widget build(BuildContext context) {
    final isPaid = order.status != 'awaiting_payment';
    return Column(
      children: [
        _Row(
          'Status',
          isPaid ? 'Paid' : 'Unpaid',
          valueColor: isPaid ? const Color(0xFF16A34A) : const Color(0xFFF59E0B),
          bold: true,
        ),
        if (isPaid) _Row('Method', paymentMethodLabel(order.paymentMethod)),
        _Row('Total', 'GHS ${order.displayTotal}'),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.bold = false, this.valueColor});
  final String label, value;
  final bool bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.order,
    required this.payLoading,
    required this.submitting,
    required this.onPay,
    required this.onCancel,
    required this.onReport,
    required this.onRate,
  });

  final GasOrder order;
  final bool payLoading, submitting;
  final VoidCallback onPay, onCancel, onReport, onRate;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 0, right: 0, bottom: 0,
      child: Material(
        color: GetGasColors.bgCard,
        child: SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: GetGasColors.border))),
            child: order.status == 'awaiting_payment'
                ? Row(children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onCancel,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: GetGasColors.error,
                          minimumSize: const Size(0, 46),
                          side: BorderSide(color: GetGasColors.error.withValues(alpha: 0.3)),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: PrimaryButton(label: 'Complete Payment', loading: payLoading, onPressed: payLoading ? null : onPay),
                    ),
                  ])
                : Row(children: [
                    if (order.status == 'pending') ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onCancel,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: GetGasColors.error,
                            minimumSize: const Size(0, 46),
                            side: BorderSide(color: GetGasColors.error.withValues(alpha: 0.3)),
                          ),
                          child: const Text('Cancel', style: TextStyle(fontSize: 12)),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onReport,
                        style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
                        child: const Text('Report', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: order.status == 'delivered' && order.riderRating == null ? onRate : null,
                        style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)),
                        child: Text(order.riderRating != null ? 'Rated ✓' : 'Rate', style: const TextStyle(fontSize: 12)),
                      ),
                    ),
                  ]),
          ),
        ),
      ),
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({required this.label, required this.selected, required this.onTap, this.errorColor = false});
  final String label;
  final bool selected, errorColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = errorColor ? GetGasColors.error : GetGasColors.brand;
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 46),
        alignment: Alignment.centerLeft,
        foregroundColor: selected ? color : GetGasColors.text,
        backgroundColor: selected ? color.withValues(alpha: 0.07) : null,
        side: BorderSide(color: selected ? color : GetGasColors.border),
      ),
      child: Text(label),
    );
  }
}

class _Modal extends StatelessWidget {
  const _Modal({required this.title, required this.onClose, required this.child});
  final String title;
  final VoidCallback onClose;
  final Widget child;

  @override
  Widget build(BuildContext context) {
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
}

final _orderDetailProvider = FutureProvider.family<GasOrder, String>((ref, id) {
  return ref.watch(ordersApiProvider).getById(id);
});
