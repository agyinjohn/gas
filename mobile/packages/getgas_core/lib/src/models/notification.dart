class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.type,
    this.orderId,
  });

  final String id;
  final String title;
  final String body;
  final bool read;
  final String? createdAt;
  final String? type;
  final String? orderId;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final orderIdRaw = json['orderId'];
    return AppNotification(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? json['message'] as String? ?? '',
      read: json['read'] as bool? ?? false,
      createdAt: json['createdAt']?.toString(),
      type: json['type'] as String?,
      orderId: orderIdRaw?.toString(),
    );
  }
}

class NotificationsListResult {
  const NotificationsListResult({
    required this.notifications,
    required this.unreadCount,
  });

  final List<AppNotification> notifications;
  final int unreadCount;
}
