import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'auth_provider.dart';

final ridersApiProvider = Provider<RidersApi>((ref) {
  return RidersApi(ref.watch(authRepositoryProvider).client);
});

final ordersApiProvider = Provider<OrdersApi>((ref) {
  return OrdersApi(ref.watch(authRepositoryProvider).client);
});

final notificationsApiProvider = Provider<NotificationsApi>((ref) {
  return NotificationsApi(ref.watch(authRepositoryProvider).client);
});
