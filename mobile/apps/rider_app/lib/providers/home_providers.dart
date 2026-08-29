import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';

import 'api_providers.dart';
import '../services/cache_service.dart';

// Cache-first: return cached data immediately, refresh in background.
final riderProfileProvider = FutureProvider<Rider>((ref) async {
  final cached = await CacheService.loadProfile();
  if (cached != null) {
    ref.read(ridersApiProvider).getMe().then((fresh) {
      CacheService.saveProfile(fresh.toJson());
      ref.invalidateSelf();
    }).catchError((_) {});
    return Rider.fromJson(cached);
  }
  final rider = await ref.read(ridersApiProvider).getMe();
  await CacheService.saveProfile(rider.toJson());
  return rider;
});

final riderDashboardProvider = FutureProvider<RiderDashboard>((ref) async {
  final cached = await CacheService.loadDashboard();
  if (cached != null) {
    ref.read(ridersApiProvider).getDashboard().then((fresh) {
      CacheService.saveDashboard(fresh.toJson());
      ref.invalidateSelf();
    }).catchError((_) {});
    return RiderDashboard.fromJson(cached);
  }
  final dash = await ref.read(ridersApiProvider).getDashboard();
  await CacheService.saveDashboard(dash.toJson());
  return dash;
});

final activeOrdersProvider = FutureProvider<List<GasOrder>>((ref) async {
  final cached = await CacheService.loadActiveOrders();
  if (cached != null) {
    ref.read(ordersApiProvider).list(
      status: 'accepted,at_station,en_route',
      limit: 20,
    ).then((fresh) {
      CacheService.saveActiveOrders(fresh.map((o) => o.toJson()).toList());
      ref.invalidateSelf();
    }).catchError((_) {});
    return cached.map(GasOrder.fromJson).where((o) => o.hasValidId).toList();
  }
  try {
    final orders = await ref.read(ordersApiProvider).list(
      status: 'accepted,at_station,en_route',
      limit: 20,
    );
    await CacheService.saveActiveOrders(orders.map((o) => o.toJson()).toList());
    return orders;
  } catch (_) {
    return [];
  }
});
