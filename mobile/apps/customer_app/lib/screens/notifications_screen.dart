import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../widgets/order_timeline.dart';
import '../widgets/sub_page_scaffold.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  Widget build(BuildContext context) {
    final notifsAsync = ref.watch(_notificationsProvider);

    return SubPageScaffold(
      title: 'Notifications',
      subtitle: notifsAsync.valueOrNull != null && notifsAsync.value!.unreadCount > 0
          ? '${notifsAsync.value!.unreadCount} unread'
          : null,
      child: notifsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => const Center(child: Text('Could not load notifications')),
        data: (result) {
          if (result.notifications.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.notifications_none, size: 48, color: GetGasColors.textMuted),
                    SizedBox(height: 12),
                    Text('No notifications yet', style: TextStyle(fontWeight: FontWeight.w700)),
                    SizedBox(height: 4),
                    Text('You\'ll be notified about your orders here.', style: TextStyle(color: GetGasColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
            );
          }

          return Column(
            children: [
              if (result.unreadCount > 0)
                Align(
                  alignment: Alignment.centerRight,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: TextButton(
                      onPressed: () async {
                        await ref.read(notificationsApiProvider).markAllRead();
                        ref.invalidate(_notificationsProvider);
                      },
                      child: const Text('Mark all read', style: TextStyle(color: GetGasColors.brand, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: result.notifications.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final n = result.notifications[i];
                    return _NotificationTile(
                      notification: n,
                      onTap: () {
                        if (n.orderId != null && n.orderId!.isNotEmpty) {
                          context.push('/orders/${n.orderId}');
                        }
                      },
                    );
                  },
                ),
              ),
            ],
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
    return Material(
      color: notification.read ? GetGasColors.bgCard : GetGasColors.brand.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: notification.read ? GetGasColors.border : GetGasColors.brand.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.notifications_outlined, color: GetGasColors.brand, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(notification.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                        if (!notification.read)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 6),
                            decoration: const BoxDecoration(color: GetGasColors.brand, shape: BoxShape.circle),
                          ),
                      ],
                    ),
                    if (notification.body.isNotEmpty)
                      Text(notification.body, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                    if (notification.createdAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(formatRelativeTime(notification.createdAt), style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted)),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final _notificationsProvider = FutureProvider<NotificationsListResult>((ref) {
  return ref.watch(notificationsApiProvider).list();
});
