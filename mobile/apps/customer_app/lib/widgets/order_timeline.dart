import 'package:flutter/material.dart';
import 'package:getgas_ui/getgas_ui.dart';

const _statusOrder = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];

const _trackSteps = [
  (key: 'pending', label: 'Order Placed', icon: Icons.receipt_long_outlined),
  (key: 'accepted', label: 'Rider Dispatched', icon: Icons.two_wheeler),
  (key: 'at_station', label: 'Picking Up', icon: Icons.store_outlined),
  (key: 'en_route', label: 'Return from Station', icon: Icons.navigation_outlined),
  (key: 'delivered', label: 'Delivered', icon: Icons.check_circle_outline),
];

/// Vertical order status timeline — mirrors web track/order detail steps.
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
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: GetGasColors.error.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: GetGasColors.error.withValues(alpha: 0.2)),
        ),
        child: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: GetGasColors.error),
            SizedBox(width: 12),
            Expanded(
              child: Text('Order cancelled', style: TextStyle(fontWeight: FontWeight.w600, color: GetGasColors.error)),
            ),
          ],
        ),
      );
    }

    final current = _currentIndex;

    return Column(
      children: [
        for (var i = 0; i < _trackSteps.length; i++) ...[
          _StepRow(
            label: _trackSteps[i].label,
            icon: _trackSteps[i].icon,
            done: i < current,
            active: i == current,
            isLast: i == _trackSteps.length - 1,
          ),
        ],
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.label,
    required this.icon,
    required this.done,
    required this.active,
    required this.isLast,
  });

  final String label;
  final IconData icon;
  final bool done;
  final bool active;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = done || active ? GetGasColors.brand : GetGasColors.textMuted;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: done || active
                        ? GetGasColors.brand.withValues(alpha: 0.12)
                        : GetGasColors.bgCard2,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: done || active ? GetGasColors.brand : GetGasColors.border,
                      width: active ? 2 : 1,
                    ),
                  ),
                  child: Icon(icon, size: 14, color: color),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: done ? GetGasColors.brand : GetGasColors.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20, top: 4),
              child: Text(
                label,
                style: TextStyle(
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  color: active ? GetGasColors.text : GetGasColors.textMuted,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
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
