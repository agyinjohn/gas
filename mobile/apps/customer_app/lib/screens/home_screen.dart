import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../data/checkout_storage.dart';
import '../providers/api_providers.dart';
import '../providers/location_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _quickAmount = TextEditingController();
  int _radius = 10;
  bool _quickLoading = false;

  @override
  void dispose() {
    _quickAmount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final location = ref.watch(locationProvider);
    final coords = location.coords;

    if (!location.loading && !location.hasCoords) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/location');
      });
    }

    final stationsAsync = coords == null
        ? const AsyncValue<List<Station>>.loading()
        : ref.watch(_nearbyStationsProvider((coords.lat, coords.lng, _radius)));

    final ordersAsync = ref.watch(_activeOrderProvider);
    final unreadAsync = ref.watch(_unreadCountProvider);

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          const SizedBox(height: 12),
          HomeHeader(
            locationLabel: location.label,
            locationState: location.displayState,
            hasCoords: location.hasCoords,
            unreadCount: unreadAsync.valueOrNull ?? 0,
            onLocationTap: () => context.push('/location'),
            onNotificationsTap: () => context.push('/notifications'),
          ),
          Expanded(
            child: RefreshIndicator(
              color: GetGasColors.brand,
              onRefresh: () async {
                await ref.read(locationProvider.notifier).silentRefresh();
                ref.invalidate(_nearbyStationsProvider);
                ref.invalidate(_activeOrderProvider);
                ref.invalidate(_unreadCountProvider);
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                children: [
                  ordersAsync.when(
                    data: (order) {
                      if (order == null) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: ActiveOrderBanner(
                          order: order,
                          onTrack: () => context.go('/track/${order.id}'),
                        ),
                      );
                    },
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                  QuickOrderCard(
                    controller: _quickAmount,
                    loading: _quickLoading,
                    onSubmit: () => _handleQuickOrder(coords),
                  ),
                  const SizedBox(height: 24),
                  _stationsSection(stationsAsync, location),
                  const SizedBox(height: 24),
                  ReferEarnCard(
                    onTap: () => context.push('/loyalty'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stationsSection(AsyncValue<List<Station>> stationsAsync, LocationState location) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Nearby Stations',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: GetGasColors.text),
              ),
            ),
            stationsAsync.when(
              data: (list) => list.isEmpty
                  ? const SizedBox.shrink()
                  : Text(
                      '${list.length} found',
                      style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
        const SizedBox(height: 8),
        RadiusFilterChips(
          radius: _radius,
          onChanged: (r) => setState(() => _radius = r),
        ),
        const SizedBox(height: 12),
        if (!location.hasCoords && location.displayState == LocationDisplayState.denied)
          _noLocationPrompt()
        else
          stationsAsync.when(
            loading: () => const StationSkeletonList(),
            error: (_, __) => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('Could not load stations', style: TextStyle(color: GetGasColors.textMuted)),
              ),
            ),
            data: (stations) {
              if (stations.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Column(
                    children: [
                      Icon(Icons.local_fire_department_outlined, size: 32, color: GetGasColors.textMuted),
                      SizedBox(height: 8),
                      Text('No stations found nearby', style: TextStyle(color: GetGasColors.textMuted)),
                    ],
                  ),
                );
              }
              return Column(
                children: [
                  for (final s in stations)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: StationCard(
                        station: s,
                        onTap: () => context.push('/checkout?stationId=${s.id}'),
                      ),
                    ),
                ],
              );
            },
          ),
      ],
    );
  }

  Widget _noLocationPrompt() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: GetGasColors.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.navigation, color: GetGasColors.brand, size: 28),
          ),
          const SizedBox(height: 12),
          const Text('Where are you?', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          const Text(
            'Set your location to find nearby stations.',
            style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => context.push('/location'),
            icon: const Icon(Icons.location_on, size: 16),
            label: const Text('Set My Location'),
            style: ElevatedButton.styleFrom(
              backgroundColor: GetGasColors.brand,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleQuickOrder(({double lat, double lng})? coords) async {
    final amount = double.tryParse(_quickAmount.text);
    if (amount == null || amount < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid amount')),
      );
      return;
    }
    if (coords == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not get your location')),
      );
      return;
    }

    setState(() => _quickLoading = true);
    try {
      final stations = await ref.read(stationsApiProvider).getNearby(
            lat: coords.lat,
            lng: coords.lng,
            radius: 25,
          );

      Station? foundStation;
      CylinderListing? foundListing;

      for (final s in stations) {
        if (s.outOfStock || !s.isOpenNow) continue;
        final available = s.cylinderListings.where((l) => l.isAvailable && l.fillPrice > 0).toList();
        if (available.isEmpty) continue;

        available.sort((a, b) => a.fillPrice.compareTo(b.fillPrice));
        CylinderListing? selected;
        for (final listing in available) {
          if (listing.fillPrice >= amount) {
            selected = listing;
            break;
          }
        }
        selected ??= available.last;

        foundStation = s;
        foundListing = selected;
        break;
      }

      if (foundStation == null || foundListing == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No gas available at nearby stations')),
          );
        }
        return;
      }

      if (mounted) {
        final loc = ref.read(locationProvider);
        final storage = CheckoutStorage();
        await storage.clearCart(CheckoutStorage.quickOrderCartKey);
        await storage.clearCart(CheckoutStorage.checkoutCartKey);
        await storage.clearCart(CheckoutStorage.editOrderCartKey);

        final cartItem = CartItem(
          size: foundListing.size,
          quantity: 1,
          unitPrice: amount,
        );
        await storage.saveCart(CheckoutStorage.quickOrderCartKey, [cartItem]);

        PricingConfig pricing;
        try {
          pricing = await ref.read(stationsApiProvider).getPricing();
        } catch (_) {
          pricing = PricingConfig.defaults;
        }
        final deliveryFee = calcDeliveryFeeFromCoords(
          userLat: coords.lat,
          userLng: coords.lng,
          stationLat: foundStation.lat,
          stationLng: foundStation.lng,
          config: pricing,
        );

        final q = {
          'stationId': foundStation.id,
          'stationName': foundStation.name,
          'stationAddress': foundStation.address,
          'stationLat': '${foundStation.lat}',
          'stationLng': '${foundStation.lng}',
          'serviceType': 'refill',
          'schedule': 'asap',
          'pickupStreet': loc.address.isNotEmpty ? loc.address : loc.label,
          'pickupCity': '',
          'pickupLat': '${coords.lat}',
          'pickupLng': '${coords.lng}',
          'pickupLabel': loc.label.isNotEmpty ? loc.label : 'Current location',
          'deliveryStreet': loc.address.isNotEmpty ? loc.address : loc.label,
          'deliveryCity': '',
          'deliveryLat': '${coords.lat}',
          'deliveryLng': '${coords.lng}',
          'deliveryLabel': loc.label.isNotEmpty ? loc.label : 'Current location',
          'subtotal': amount.toStringAsFixed(2),
          'deliveryFee': deliveryFee.toStringAsFixed(2),
          'isQuickOrder': 'true',
        };
        if (!mounted) return;
        context.push('/checkout/review?${Uri(queryParameters: q).query}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _quickLoading = false);
    }
  }
}

final _nearbyStationsProvider =
    FutureProvider.family<List<Station>, (double, double, int)>((ref, args) {
  final (lat, lng, radius) = args;
  return ref.watch(stationsApiProvider).getNearby(lat: lat, lng: lng, radius: radius.toDouble());
});

final _activeOrderProvider = FutureProvider<GasOrder?>((ref) async {
  const active = ['awaiting_payment', 'pending', 'accepted', 'at_station', 'en_route'];
  final orders = await ref.watch(ordersApiProvider).list(
    status: active.join(','),
    limit: 50,
  );
  if (orders.isEmpty) return null;
  orders.sort((a, b) {
    final aDate = DateTime.tryParse(a.createdAt ?? '') ?? DateTime(0);
    final bDate = DateTime.tryParse(b.createdAt ?? '') ?? DateTime(0);
    return bDate.compareTo(aDate);
  });
  return orders.first;
});

final _unreadCountProvider = FutureProvider<int>((ref) {
  return ref.watch(notificationsApiProvider).unreadCount();
});
