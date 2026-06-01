import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../data/checkout_storage.dart';
import '../providers/api_providers.dart';
import '../providers/location_provider.dart';
import '../widgets/checkout/checkout_line_item_card.dart';
import '../widgets/checkout/checkout_page_header.dart';
import '../widgets/checkout/checkout_section.dart';
import '../widgets/checkout/dashed_rounded_border.dart';

/// Full checkout — mirrors web `/user/checkout`.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.params});

  final Map<String, String> params;

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _storage = CheckoutStorage();
  final _lines = <CheckoutLineItem>[];
  Station? _selectedStation;
  String? _effectiveStationId;
  String _schedule = 'asap';
  String _scheduledDate = '';
  PickedLocation? _pickupLoc;
  PickedLocation? _deliveryLoc;
  bool _sameAsPickup = true;
  String? _photoBase64;
  bool _initialized = false;
  late final TextEditingController _editAmountController;
  late final TextEditingController _scheduledDateController;

  bool get _fromReview => widget.params['fromReview'] == 'true';
  bool get _isQuickOrder =>
      widget.params['isQuickOrder'] == 'true' || widget.params['source'] == 'quick';
  bool get _hasStationParam => _stationIdParam != null;
  String? get _stationIdParam => widget.params['stationId'];

  @override
  void initState() {
    super.initState();
    _editAmountController = TextEditingController();
    _scheduledDateController = TextEditingController();
    _effectiveStationId = _stationIdParam;
    _schedule = widget.params['schedule'] ?? 'asap';
    _scheduledDate = widget.params['scheduledDate'] ?? '';
    if (_scheduledDate.isNotEmpty) {
      _scheduledDateController.text =
          DateTime.tryParse(_scheduledDate)?.toLocal().toString().substring(0, 16) ?? '';
    }
    _sameAsPickup = _isQuickOrder || widget.params.containsKey('pickupLat');
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _editAmountController.dispose();
    _scheduledDateController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await _seedLocations();
    await _loadCartLines();
    if (mounted) setState(() => _initialized = true);
  }

  Future<void> _seedLocations() async {
    final pLat = widget.params['pickupLat'];
    final pLng = widget.params['pickupLng'];
    if (pLat != null && pLng != null) {
      _pickupLoc = PickedLocation(
        lat: double.parse(pLat),
        lng: double.parse(pLng),
        street: widget.params['pickupStreet'] ?? widget.params['pickupLabel'] ?? 'Current location',
        city: widget.params['pickupCity'] ?? '',
        formatted: widget.params['pickupLabel'] ?? 'Current location',
      );
    } else {
      final loc = ref.read(locationProvider);
      if (loc.hasCoords) {
        _pickupLoc = PickedLocation(
          lat: loc.coords!.lat,
          lng: loc.coords!.lng,
          street: loc.address.isNotEmpty ? loc.address : loc.label,
          city: '',
          formatted: loc.label.isNotEmpty ? loc.label : 'Current location',
        );
      }
    }

    final dLat = widget.params['deliveryLat'];
    final dLng = widget.params['deliveryLng'];
    if (dLat != null && dLng != null && dLat.isNotEmpty && dLng.isNotEmpty) {
      _deliveryLoc = PickedLocation(
        lat: double.parse(dLat),
        lng: double.parse(dLng),
        street: widget.params['deliveryStreet'] ?? widget.params['deliveryLabel'] ?? '',
        city: widget.params['deliveryCity'] ?? '',
        formatted: widget.params['deliveryLabel'] ?? '',
      );
      _sameAsPickup = false;
    }

    _photoBase64 = await _storage.loadPhoto();
  }

  Future<void> _loadCartLines() async {
    List<CartItem> items = [];
    if (_fromReview) {
      items = await _storage.loadCart(CheckoutStorage.editOrderCartKey);
    }
    if (items.isEmpty && _isQuickOrder) {
      items = await _storage.loadCart(CheckoutStorage.quickOrderCartKey);
    }
    if (items.isEmpty) {
      items = await _storage.loadCart(CheckoutStorage.checkoutCartKey);
    }

    if (items.isNotEmpty) {
      _lines
        ..clear()
        ..addAll(items.map((i) => CheckoutLineItem(
              size: i.size,
              quantity: i.quantity,
              price: i.unitPrice.toStringAsFixed(2),
            )));
      if (_lines.isNotEmpty) {
        _editAmountController.text = _lines.first.price;
      }
      return;
    }

    final amount = double.tryParse(widget.params['amount'] ?? '');
    if (_stationIdParam != null && amount != null) {
      try {
        final station = await ref.read(stationsApiProvider).getById(_stationIdParam!);
        final available = station.cylinderListings
            .where((l) => l.isAvailable && l.fillPrice > 0)
            .toList()
          ..sort((a, b) => a.fillPrice.compareTo(b.fillPrice));
        if (available.isNotEmpty) {
          CylinderListing? matched;
          for (final l in available) {
            if (l.fillPrice >= amount) {
              matched = l;
              break;
            }
          }
          matched ??= available.last;
          _lines.add(CheckoutLineItem(
            size: matched.size,
            quantity: 1,
            price: amount.toStringAsFixed(2),
          ));
        }
      } catch (_) {}
    }
  }

  List<CartItem> get _cartItems => _lines.map((l) {
        final entered = double.tryParse(l.price) ?? minCylinderPrice.toDouble();
        final price = entered < minCylinderPrice ? minCylinderPrice.toDouble() : entered;
        return CartItem(
          id: l.id,
          size: l.size,
          quantity: l.quantity,
          unitPrice: price,
        );
      }).toList();

  int get _totalQty => _lines.fold(0, (a, l) => a + l.quantity);
  double get _subtotal => _cartItems.fold(0, (a, b) => a + b.subtotal);

  bool get _hasPriceError => _lines.any((l) {
        final entered = double.tryParse(l.price);
        return l.price.isNotEmpty && entered != null && entered < minCylinderPrice;
      });

  Future<void> _pickLocation({required bool pickup}) async {
    final result = await context.push<PickedLocation>('/location?pick=1');
    if (result == null || !mounted) return;
    setState(() {
      if (pickup) {
        _pickupLoc = result;
      } else {
        _deliveryLoc = result;
        _sameAsPickup = false;
      }
    });
  }

  Future<void> _pickPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: GetGasColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: GetGasColors.border,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Add cylinder photo', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_outlined, color: GetGasColors.brand),
                title: const Text('Take photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: GetGasColors.brand),
                title: const Text('Choose from gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null || !mounted) return;

    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    if (bytes.length > 5 * 1024 * 1024) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo must be under 5MB')),
        );
      }
      return;
    }
    final b64 = base64Encode(bytes);
    await _storage.savePhoto(b64);
    setState(() => _photoBase64 = b64);
  }

  Future<void> _continueToReview(PricingConfig pricing, Station? station) async {
    if (_effectiveStationId == null) {
      _toast('Please select a station');
      return;
    }
    if (_totalQty == 0) {
      _toast('Select at least one cylinder');
      return;
    }
    if (_hasPriceError) {
      _toast('Price must be at least ₵$minCylinderPrice');
      return;
    }
    if (_pickupLoc == null) {
      _toast('Please set your pickup location');
      return;
    }
    final effectiveDelivery = _sameAsPickup ? _pickupLoc : _deliveryLoc;
    if (effectiveDelivery == null) {
      _toast('Please set your delivery location');
      return;
    }

    final cartKey = _isQuickOrder
        ? CheckoutStorage.quickOrderCartKey
        : CheckoutStorage.checkoutCartKey;
    await _storage.saveCart(cartKey, _cartItems);
    if (_fromReview) {
      await _storage.clearCart(CheckoutStorage.editOrderCartKey);
    }

    final deliveryFee = station != null
        ? calcDeliveryFeeFromCoords(
            userLat: _pickupLoc!.lat,
            userLng: _pickupLoc!.lng,
            stationLat: station.lat,
            stationLng: station.lng,
            config: pricing,
          )
        : pricing.baseFee;

    final q = {
      'stationId': _effectiveStationId!,
      'stationName': station?.name ?? _selectedStation?.name ?? '',
      'stationAddress': station?.address ?? _selectedStation?.address ?? '',
      'stationLat': '${station?.lat ?? ''}',
      'stationLng': '${station?.lng ?? ''}',
      'serviceType': 'refill',
      'schedule': _schedule,
      if (_scheduledDate.isNotEmpty) 'scheduledDate': _scheduledDate,
      'pickupStreet': _pickupLoc!.street,
      'pickupCity': _pickupLoc!.city,
      'pickupLat': '${_pickupLoc!.lat}',
      'pickupLng': '${_pickupLoc!.lng}',
      'pickupLabel': _pickupLoc!.formatted,
      'deliveryStreet': effectiveDelivery.street,
      'deliveryCity': effectiveDelivery.city,
      'deliveryLat': '${effectiveDelivery.lat}',
      'deliveryLng': '${effectiveDelivery.lng}',
      'deliveryLabel': effectiveDelivery.formatted,
      'subtotal': _subtotal.toStringAsFixed(2),
      'deliveryFee': deliveryFee.toStringAsFixed(2),
      if (_isQuickOrder) 'isQuickOrder': 'true',
    };
    if (!mounted) return;
    context.push('/checkout/review?${Uri(queryParameters: q).query}');
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _addLine(int size, Station station) {
    final listing = station.cylinderListings.where((l) => l.size == size).firstOrNull;
    final minPrice = listing?.fillPrice ?? minCylinderPrice.toDouble();
    final amount = double.tryParse(widget.params['amount'] ?? '');
    final price = _isQuickOrder && amount != null ? amount : minPrice;
    setState(() {
      _lines.add(CheckoutLineItem(
        size: size,
        quantity: 1,
        price: price.toStringAsFixed(2),
      ));
    });
  }

  @override
  Widget build(BuildContext context) {
    final pricingAsync = ref.watch(_pricingProvider);

    if (!_initialized) {
      return Scaffold(
        backgroundColor: GetGasColors.bg,
        body: Column(
          children: [
            CheckoutPageHeader(title: 'Place Order', onBack: () => context.pop()),
            const Expanded(child: Center(child: CircularProgressIndicator(color: GetGasColors.brand))),
          ],
        ),
      );
    }

    if (_stationIdParam == null && _effectiveStationId == null) {
      return Scaffold(
        backgroundColor: GetGasColors.bg,
        body: Column(
          children: [
            CheckoutPageHeader(title: 'Place Order', onBack: () => context.pop()),
            Expanded(child: _stationSelectorView()),
          ],
        ),
      );
    }

    final stationAsync = ref.watch(_stationProvider(_effectiveStationId!));

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: Column(
        children: [
          CheckoutPageHeader(title: 'Place Order', onBack: () => context.pop()),
          Expanded(
            child: stationAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
              error: (_, __) => const Center(child: Text('Could not load station')),
              data: (station) => _checkoutBody(station, pricingAsync),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stationSelectorView() {
    final coords = ref.watch(locationProvider).coords;
    final stationsAsync = coords == null
        ? const AsyncValue<List<Station>>.loading()
        : ref.watch(_nearbyStationsProvider((coords.lat, coords.lng)));

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
      children: [
        const Text(
          '1. Select Station',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GetGasColors.text),
        ),
        const SizedBox(height: 4),
        const Text(
          'Choose where to refill your cylinder',
          style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
        ),
        const SizedBox(height: 12),
        stationsAsync.when(
          loading: () => const Row(
            children: [
              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              SizedBox(width: 8),
              Text('Finding nearby stations…', style: TextStyle(color: GetGasColors.textMuted)),
            ],
          ),
          error: (_, __) => const Text('Could not load stations'),
          data: (stations) {
            if (stations.isEmpty) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: Text('No stations found nearby.', style: TextStyle(color: GetGasColors.textMuted))),
              );
            }
            return Column(children: stations.map(_stationSelectTile).toList());
          },
        ),
      ],
    );
  }

  Widget _stationSelectTile(Station s) {
    final selected = _selectedStation?.id == s.id;
    final minPrice = s.minFillPrice;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected ? GetGasColors.brand.withValues(alpha: 0.1) : GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => setState(() {
            _selectedStation = s;
            _effectiveStationId = s.id;
          }),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: selected ? GetGasColors.brand : GetGasColors.border,
                width: 2,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: selected ? GetGasColors.brand : GetGasColors.brand.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.local_fire_department, color: selected ? Colors.white : GetGasColors.brand),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      Row(
                        children: [
                          Text('${s.distanceKm} km', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                          const SizedBox(width: 8),
                          Text('★ ${s.ratingAvg.toStringAsFixed(1)}', style: const TextStyle(fontSize: 12, color: Color(0xFFF59E0B))),
                          if (minPrice != null) ...[
                            const SizedBox(width: 8),
                            Text('From ₵$minPrice', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: GetGasColors.brand)),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                if (selected) const Icon(Icons.check_circle, color: GetGasColors.brand, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }

  int get _cylinderStep => _hasStationParam ? 1 : 2;
  int get _scheduleStep => _hasStationParam ? 2 : 3;
  int get _pickupStep => _hasStationParam ? 3 : 4;
  int get _deliveryStep => _hasStationParam ? 4 : 5;
  int get _photoStep => _hasStationParam ? 5 : 6;

  Widget _checkoutBody(Station? station, AsyncValue<PricingConfig> pricingAsync) {
    final availableSizes = station == null
        ? <int>[]
        : (station.cylinderListings
              .where((l) => l.fillPrice > 0)
              .map((l) => l.size)
              .toList()
            ..sort());

    final pricing = pricingAsync.valueOrNull ?? PricingConfig.defaults;
    final deliveryFee = station != null && _pickupLoc != null
        ? calcDeliveryFeeFromCoords(
            userLat: _pickupLoc!.lat,
            userLng: _pickupLoc!.lng,
            stationLat: station.lat,
            stationLng: station.lng,
            config: pricing,
          )
        : pricing.baseFee;
    final total = _subtotal + deliveryFee;

    return Stack(
      children: [
        ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 240),
          children: [
            if (_hasStationParam && station != null) ...[
              _stationBanner(station),
              const SizedBox(height: 28),
            ],
            if (_fromReview && _lines.isNotEmpty) ...[
              _editAmountCard(station),
              const SizedBox(height: 28),
            ],
            CheckoutSectionTitle(
              step: _fromReview ? null : _cylinderStep,
              title: _fromReview ? 'Change Cylinder Details' : 'Cylinder Details',
              subtitle: _fromReview ? null : 'Tap a size to add it to your order',
            ),
            const SizedBox(height: 12),
            if (station == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'Select a station above to see available cylinders.',
                    style: TextStyle(color: GetGasColors.textMuted),
                  ),
                ),
              )
            else if (availableSizes.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(
                  child: Text(
                    'No cylinders currently available at this station.',
                    style: TextStyle(color: GetGasColors.textMuted),
                  ),
                ),
              )
            else if (!_fromReview)
              _sizeCatalogue(station, availableSizes),
            if (_lines.isNotEmpty && !_fromReview) ...[
              const SizedBox(height: 20),
              _lineItemsList(),
            ],
            const SizedBox(height: 28),
            _scheduleSection(),
            const SizedBox(height: 28),
            _locationSection(
              step: _pickupStep,
              title: 'Pickup Location',
              subtitle: 'Where the rider will collect the cylinder from you',
              location: _pickupLoc,
              onTap: () => _pickLocation(pickup: true),
            ),
            const SizedBox(height: 28),
            _deliverySection(),
            const SizedBox(height: 28),
            _photoSection(_photoStep),
          ],
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _bottomBar(deliveryFee, total, station, pricing),
        ),
      ],
    );
  }

  Widget _stationBanner(Station station) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: GetGasColors.brand.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.local_fire_department, color: GetGasColors.brand),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(station.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                Text(station.address, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
              ],
            ),
          ),
          TextButton(onPressed: () => context.pop(), child: const Text('Change', style: TextStyle(color: GetGasColors.brand, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _editAmountCard(Station? station) {
    if (_lines.isEmpty) return const SizedBox.shrink();
    final line = _lines.first;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.brand.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Edit Amount', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Enter amount in cedis (GHS)', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                    const SizedBox(height: 6),
                    TextField(
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      controller: _editAmountController,
                      onChanged: (v) {
                        line.price = v;
                        _updateMatchedSize(line, station);
                        setState(() {});
                      },
                      decoration: InputDecoration(
                        hintText: 'e.g., 91',
                        hintStyle: TextStyle(color: GetGasColors.textMuted.withValues(alpha: 0.45)),
                        filled: true,
                        fillColor: GetGasColors.bgCard2,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: GetGasColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Estimated size', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: GetGasColors.brand.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: GetGasColors.brand.withValues(alpha: 0.3)),
                      ),
                      child: Text('${line.size}kg', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('Enter any amount — size is auto-detected', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
        ],
      ),
    );
  }

  void _updateMatchedSize(CheckoutLineItem line, Station? station) {
    if (station == null) return;
    final entered = double.tryParse(line.price);
    if (entered == null) return;
    final available = station.cylinderListings.where((l) => l.isAvailable && l.fillPrice > 0).toList()
      ..sort((a, b) => a.fillPrice.compareTo(b.fillPrice));
    for (final l in available) {
      if (l.fillPrice >= entered) {
        line.size = l.size;
        return;
      }
    }
    if (available.isNotEmpty) line.size = available.last.size;
  }

  Widget _sizeCatalogue(Station station, List<int> sizes) {
    return Stack(
      children: [
        SizedBox(
          height: 148,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(top: 4, bottom: 8, right: 8),
            itemCount: sizes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) => _sizeTile(station, sizes[i]),
          ),
        ),
        Positioned(
          right: 0,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Container(
              width: 40,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerRight,
                  end: Alignment.centerLeft,
                  colors: [GetGasColors.bg, GetGasColors.bg.withValues(alpha: 0)],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sizeTile(Station station, int size) {
    final listing = station.cylinderListings.where((l) => l.size == size).firstOrNull;
    final price = listing?.fillPrice ?? 0;
    final count = _lines.where((l) => l.size == size).length;
    final selected = count > 0;

    return Material(
      color: selected ? GetGasColors.brand.withValues(alpha: 0.1) : GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => _addLine(size, station),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 96,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? GetGasColors.brand : GetGasColors.border,
              width: 2,
            ),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              if (selected)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: GetGasColors.brand,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)],
                    ),
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: selected ? GetGasColors.brand : GetGasColors.brand.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '$size',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            height: 1,
                            color: selected ? Colors.white : GetGasColors.brand,
                          ),
                        ),
                        Text(
                          'kg',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: selected ? Colors.white70 : GetGasColors.brand,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!_isQuickOrder) ...[
                    const SizedBox(height: 6),
                    Text(
                      '₵$price',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    decoration: BoxDecoration(
                      color: selected ? GetGasColors.brand : GetGasColors.bgCard2,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      selected ? 'Added' : 'Tap',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: selected ? Colors.white : GetGasColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _lineItemsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'YOUR ORDER',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: GetGasColors.textMuted,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 10),
        ..._lines.map(
          (line) => CheckoutLineItemCard(
            key: ValueKey(line.id),
            line: line,
            onChanged: () => setState(() {}),
            onRemove: () => setState(() => _lines.remove(line)),
          ),
        ),
      ],
    );
  }

  Widget _scheduleSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CheckoutSectionTitle(step: _scheduleStep, title: 'Delivery Schedule'),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _scheduleTile('asap', Icons.bolt, 'ASAP', '~30–45 mins')),
            const SizedBox(width: 12),
            Expanded(child: _scheduleTile('scheduled', Icons.calendar_today_outlined, 'Schedule', 'Pick a date/time')),
          ],
        ),
        if (_schedule == 'scheduled') ...[
          const SizedBox(height: 12),
          TextField(
            readOnly: true,
            controller: _scheduledDateController,
            decoration: InputDecoration(
              hintText: 'Pick date & time',
              filled: true,
              fillColor: GetGasColors.bgCard,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: GetGasColors.border),
              ),
              suffixIcon: const Icon(Icons.event, color: GetGasColors.textMuted),
            ),
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 30)),
              );
              if (date == null || !mounted) return;
              final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
              if (time == null || !mounted) return;
              setState(() {
                _scheduledDate = DateTime(date.year, date.month, date.day, time.hour, time.minute).toIso8601String();
                _scheduledDateController.text =
                    DateTime.tryParse(_scheduledDate)?.toLocal().toString().substring(0, 16) ?? '';
              });
            },
          ),
        ],
      ],
    );
  }

  Widget _scheduleTile(String value, IconData icon, String label, String sub) {
    final active = _schedule == value;
    return Material(
      color: active ? GetGasColors.brand.withValues(alpha: 0.1) : GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => setState(() => _schedule = value),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: active ? GetGasColors.brand : GetGasColors.border, width: 2),
          ),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: active ? GetGasColors.brand : GetGasColors.bgCard2,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: active ? Colors.white : GetGasColors.textMuted),
              ),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: active ? GetGasColors.text : GetGasColors.textMuted)),
              Text(sub, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _locationSection({
    required int step,
    required String title,
    required String subtitle,
    required PickedLocation? location,
    required VoidCallback onTap,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CheckoutSectionTitle(step: step, title: title, subtitle: subtitle),
        const SizedBox(height: 12),
        _locationTile(location: location, onTap: onTap, emptyLabel: 'Set pickup location'),
      ],
    );
  }

  Widget _deliverySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CheckoutSectionTitle(
          step: _deliveryStep,
          title: 'Delivery Location',
          subtitle: 'Where the cylinder should be delivered after refill',
        ),
        InkWell(
          onTap: () => setState(() {
            _sameAsPickup = !_sameAsPickup;
            if (_sameAsPickup) _deliveryLoc = null;
          }),
          child: Row(
            children: [
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: _sameAsPickup ? GetGasColors.brand : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _sameAsPickup ? GetGasColors.brand : GetGasColors.textMuted, width: 2),
                ),
                child: _sameAsPickup ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
              ),
              const SizedBox(width: 8),
              const Text('Same as pickup location'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (_sameAsPickup && _pickupLoc != null)
          _locationTile(location: _pickupLoc, onTap: () {}, readOnly: true, emptyLabel: '')
        else if (!_sameAsPickup)
          _locationTile(
            location: _deliveryLoc,
            onTap: () => _pickLocation(pickup: false),
            emptyLabel: 'Set delivery location',
          ),
      ],
    );
  }

  Widget _locationTile({
    required PickedLocation? location,
    required VoidCallback onTap,
    required String emptyLabel,
    bool readOnly = false,
  }) {
    final content = Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: location != null ? GetGasColors.brand : GetGasColors.bgCard2,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.location_on,
              color: location != null ? Colors.white : GetGasColors.textMuted,
              size: 18,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: location != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        location.street,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      if (location.city.isNotEmpty)
                        Text(
                          location.city,
                          style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                        ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        emptyLabel,
                        style: const TextStyle(fontWeight: FontWeight.w600, color: GetGasColors.textMuted),
                      ),
                      const Text(
                        'Tap to pick on map',
                        style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                      ),
                    ],
                  ),
          ),
          if (!readOnly)
            Text(
              location != null ? 'Change' : 'Set',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.brand),
            ),
        ],
      ),
    );

    if (location == null && !readOnly) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: DashedRoundedBorder(
            radius: 16,
            padding: EdgeInsets.zero,
            child: content,
          ),
        ),
      );
    }

    return Material(
      color: location != null ? GetGasColors.brand.withValues(alpha: 0.1) : GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: readOnly ? null : onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: location != null ? GetGasColors.brand : GetGasColors.border,
              width: 2,
            ),
          ),
          child: content,
        ),
      ),
    );
  }

  Widget _photoSection(int step) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CheckoutSectionTitle(
          step: step,
          title: 'Picture of cylinder(s) (optional)',
        ),
        const SizedBox(height: 12),
        if (_photoBase64 != null)
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.memory(
                  base64Decode(_photoBase64!),
                  height: 192,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Material(
                  color: GetGasColors.bgCard,
                  elevation: 2,
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: () async {
                      await _storage.savePhoto(null);
                      setState(() => _photoBase64 = null);
                    },
                    customBorder: const CircleBorder(),
                    child: const SizedBox(
                      width: 32,
                      height: 32,
                      child: Icon(Icons.close, size: 18),
                    ),
                  ),
                ),
              ),
            ],
          )
        else
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _pickPhoto,
              borderRadius: BorderRadius.circular(16),
              child: DashedRoundedBorder(
                radius: 16,
                child: SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: GetGasColors.bgCard2,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.camera_alt_outlined, size: 24, color: GetGasColors.textMuted),
                      ),
                      const SizedBox(height: 12),
                      const Text('Tap to add photo', style: TextStyle(color: GetGasColors.textMuted)),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _bottomBar(double deliveryFee, double total, Station? station, PricingConfig pricing) {
    return Material(
      elevation: 8,
      shadowColor: Colors.black26,
      color: GetGasColors.bgCard,
      child: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: GetGasColors.border)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_totalQty > 0) ...[
                ..._cartItems.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${item.size}kg × ${item.quantity} @ ₵${item.unitPrice.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                        ),
                        Text(
                          '₵${item.subtotal.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Delivery', style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                    Text(
                      '₵${deliveryFee.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ] else
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text(
                      'No cylinders selected',
                      style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                    ),
                  ),
                ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Estimate', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(
                    '₵${total.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: GetGasColors.brand),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _totalQty == 0 || _hasPriceError
                      ? null
                      : () => _continueToReview(pricing, station),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GetGasColors.brand,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: GetGasColors.brand.withValues(alpha: 0.4),
                    disabledForegroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Continue', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward, size: 18),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final it = iterator;
    if (!it.moveNext()) return null;
    return it.current;
  }
}

final _pricingProvider = FutureProvider<PricingConfig>((ref) async {
  try {
    return await ref.watch(stationsApiProvider).getPricing();
  } catch (_) {
    return PricingConfig.defaults;
  }
});

final _stationProvider = FutureProvider.family<Station, String>((ref, id) {
  return ref.watch(stationsApiProvider).getById(id);
});

final _nearbyStationsProvider = FutureProvider.family<List<Station>, (double, double)>((ref, coords) {
  return ref.watch(stationsApiProvider).getNearby(lat: coords.$1, lng: coords.$2, radius: 25);
});
