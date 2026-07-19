import '../config/app_config.dart';
import '../models/notification.dart';
import 'api_client.dart';

class NotificationsApi {
  NotificationsApi(this._client);

  final GetGasApiClient _client;

  static const _prefix = '${AppConfig.apiPrefix}/notifications';

  Future<int> unreadCount() async {
    final data = await _client.getJson(_prefix);
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }

  Future<NotificationsListResult> list() async {
    final data = await _client.getJson(_prefix);
    final raw = data['notifications'] as List<dynamic>? ?? [];
    return NotificationsListResult(
      notifications: raw
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList(),
      unreadCount: (data['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  Future<void> markAllRead() async {
    await _client.patchJson('$_prefix/read-all', body: {});
  }

  Future<void> markOneRead(String id) async {
    await _client.patchJson('$_prefix/$id/read', body: {});
  }
}
