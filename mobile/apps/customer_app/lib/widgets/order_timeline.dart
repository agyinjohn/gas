import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

const _statusOrder = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const _trackSteps = [
  (key: 'pending',    label: 'Order Placed',     sub: 'We received your order',            icon: Icons.receipt_long_outlined),
  (key: 'accepted',   label: 'Rider Dispatched', sub: 'A rider is heading to the station', icon: Icons.two_wheeler_outlined),
  (key: 'at_station', label: 'Picking Up',       sub: 'Rider is collecting your gas',      icon: Icons.store_outlined),
  (key: 'en_route',   label: 'On the Way',       sub: 'Your gas is on its way to you',     icon: Icons.navigation_outlined),
  (key: 'delivered',  label: 'Delivered',        sub: 'Enjoy your gas!',                   icon: Icons.check_circle_outline),
];

class OrderTimeline extends StatelessWidget {
  const OrderTimeline({super.key, required this.status});

  final String status;

  int get _currentIndex {
    if (status == 'cancelled') return -1;
    final idx = _statusOrder.indexOf(status);
    return idx < 0 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context) {
    if (status == 'cancelled') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: GetGasColors.error.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: GetGasColors.error.withValues(alpha: 0.2)),
        ),
        child: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: GetGasColors.error, size: 20),
            SizedBox(width: 10),
            Text(
              'This order was cancelled',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GetGasColors.error),
            ),
          ],
        ),
      );
    }

    final current = _currentIndex;

    return Column(
      children: [
        for (var i = 0; i < _trackSteps.length; i++)
          _StepRow(
            step: _trackSteps[i],
            done: i < current,
            active: i == current,
            isLast: i == _trackSteps.length - 1,
          ),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.step,
    required this.done,
    required this.active,
    required this.isLast,
  });

  final ({String key, String label, String sub, IconData icon}) step;
  final bool done;
  final bool active;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Left column: circle + connector ──
          SizedBox(
            width: 44,
            child: Column(
              children: [
                _StepCircle(icon: step.icon, done: done, active: active),
                if (!isLast)
                  Expanded(
                    child: Center(
                      child: Container(
                        width: 2,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(
                          gradient: done
                              ? LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [GetGasColors.brand, GetGasColors.brand.withValues(alpha: 0.4)],
                                )
                              : null,
                          color: done ? null : GetGasColors.bgCard2,
                          borderRadius: BorderRadius.circular(1),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(width: 12),

          // ── Right column: label + sub ──
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 2, bottom: isLast ? 0 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      color: active
                          ? GetGasColors.text
                          : done
                              ? GetGasColors.text
                              : GetGasColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    step.sub,
                    style: TextStyle(
                      fontSize: 12,
                      color: active
                          ? GetGasColors.brand
                          : done
                              ? GetGasColors.textMuted
                              : GetGasColors.border,
                      fontWeight: active ? FontWeight.w500 : FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepCircle extends StatefulWidget {
  const _StepCircle({required this.icon, required this.done, required this.active});

  final IconData icon;
  final bool done;
  final bool active;

  @override
  State<_StepCircle> createState() => _StepCircleState();
}

class _StepCircleState extends State<_StepCircle> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
      ..repeat(reverse: true);
    _pulse = Tween<double>(begin: 1.0, end: 1.22).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final circle = Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: widget.done
            ? GetGasColors.brand
            : widget.active
                ? GetGasColors.brand
                : GetGasColors.bgCard2,
        border: Border.all(
          color: widget.done || widget.active ? GetGasColors.brand : GetGasColors.border,
          width: widget.active ? 2.5 : 1.5,
        ),
        boxShadow: widget.active
            ? [BoxShadow(color: GetGasColors.brand.withValues(alpha: 0.35), blurRadius: 10, spreadRadius: 2)]
            : null,
      ),
      child: widget.done
          ? const Icon(Icons.check_rounded, size: 18, color: Colors.white)
          : Icon(
              widget.icon,
              size: 18,
              color: widget.active ? Colors.white : GetGasColors.textMuted,
            ),
    );

    if (!widget.active) return circle;

    return ScaleTransition(scale: _pulse, child: circle);
  }
}

String formatRelativeTime(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  final diff = DateTime.now().difference(dt.toLocal());
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${dt.day}/${dt.month}/${dt.year}';
}
