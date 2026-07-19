import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'api_providers.dart';
import '../services/cache_service.dart';

final riderProfileProvider = FutureProvider.autoDispose<Rider>((ref) async {
  try {
    final rider = await ref.read(ridersApiProvider).getMe();
    await CacheService.saveProfile(rider.toJson());
    return rider;
  } catch (_) {
    final cached = await CacheService.loadProfile();
    if (cached != null) return Rider.fromJson(cached);
    rethrow;
  }
});

final riderDashboardProvider = FutureProvider.autoDispose<RiderDashboard>((ref) async {
  try {
    final dash = await ref.read(ridersApiProvider).getDashboard();
    await CacheService.saveDashboard(dash.toJson());
    return dash;
  } catch (_) {
    final cached = await CacheService.loadDashboard();
    if (cached != null) return RiderDashboard.fromJson(cached);
    rethrow;
  }
});

final activeOrdersProvider = FutureProvider.autoDispose<List<GasOrder>>((ref) async {
  try {
    final orders = await ref.read(ordersApiProvider).list(
      status: 'accepted,at_station,en_route',
      limit: 20,
    );
    await CacheService.saveActiveOrders(orders.map((o) => o.toJson()).toList());
    return orders;
  } catch (_) {
    final cached = await CacheService.loadActiveOrders();
    if (cached != null) {
      return cached.map(GasOrder.fromJson).where((o) => o.hasValidId).toList();
    }
    return [];
  }
});
