import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';

final _notificationsProvider =
    FutureProvider.autoDispose<NotificationsListResult>((ref) async {
  return ref.read(notificationsApiProvider).list();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_notificationsProvider);

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      appBar: AppBar(
        backgroundColor: GetGasColors.brand,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Notifications',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        actions: [
          async.maybeWhen(
            data: (result) => result.unreadCount > 0
                ? TextButton(
                    onPressed: () async {
                      await ref.read(notificationsApiProvider).markAllRead();
                      ref.invalidate(_notificationsProvider);
                    },
                    child: const Text('Mark all read',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  )
                : const SizedBox.shrink(),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: async.when(
        loading: () =>
            const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => const Center(
          child: Text('Could not load notifications',
              style: TextStyle(color: GetGasColors.textMuted)),
        ),
        data: (result) {
          if (result.notifications.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_off_outlined,
                      size: 48, color: GetGasColors.textMuted),
                  SizedBox(height: 12),
                  Text('No notifications yet',
                      style: TextStyle(
                          color: GetGasColors.textMuted,
                          fontSize: 14,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: GetGasColors.brand,
            onRefresh: () async => ref.invalidate(_notificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: result.notifications.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, color: GetGasColors.border),
              itemBuilder: (_, i) {
                final n = result.notifications[i];
                return _NotificationTile(
                  notification: n,
                  onTap: () async {
                    if (!n.read) {
                      await ref
                          .read(notificationsApiProvider)
                          .markOneRead(n.id);
                      ref.invalidate(_notificationsProvider);
                    }
                    if (n.orderId != null && context.mounted) {
                      context.push('/orders/${n.orderId}');
                    }
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});
  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final unread = !notification.read;

    return InkWell(
      onTap: onTap,
      child: Container(
        color: unread
            ? GetGasColors.brand.withValues(alpha: 0.05)
            : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: _iconBg(notification.type),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_iconFor(notification.type),
                  size: 20, color: _iconColor(notification.type)),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: unread ? FontWeight.w800 : FontWeight.w600,
                            color: GetGasColors.text,
                          ),
                        ),
                      ),
                      if (unread)
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(
                            color: GetGasColors.brand,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    notification.body,
                    style: const TextStyle(
                        fontSize: 12, color: GetGasColors.textMuted),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _timeAgo(notification.createdAt),
                    style: const TextStyle(
                        fontSize: 11, color: GetGasColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'order_accepted': return Icons.check_circle_outline_rounded;
      case 'delivered':      return Icons.local_shipping_rounded;
      case 'cancelled':      return Icons.cancel_outlined;
      default:               return Icons.notifications_outlined;
    }
  }

  Color _iconBg(String? type) {
    switch (type) {
      case 'order_accepted': return const Color(0xFFDCFCE7);
      case 'delivered':      return const Color(0xFFDCFCE7);
      case 'cancelled':      return const Color(0xFFFEE2E2);
      default:               return GetGasColors.bgCard2;
    }
  }

  Color _iconColor(String? type) {
    switch (type) {
      case 'order_accepted': return const Color(0xFF16A34A);
      case 'delivered':      return const Color(0xFF16A34A);
      case 'cancelled':      return const Color(0xFFEF4444);
      default:               return GetGasColors.textMuted;
    }
  }

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    final date = DateTime.tryParse(iso);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
