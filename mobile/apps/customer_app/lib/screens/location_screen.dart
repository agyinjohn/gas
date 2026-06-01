import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../providers/location_provider.dart';
import '../widgets/google_map_location_picker.dart';

/// Full-screen Google Maps location picker with Places search — mirrors web LocationPicker.
class LocationScreen extends ConsumerStatefulWidget {
  const LocationScreen({super.key, this.pickMode = false});

  final bool pickMode;

  @override
  ConsumerState<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends ConsumerState<LocationScreen> {
  PickedLocation? _picked;

  LatLng? get _initial {
    final loc = ref.read(locationProvider);
    if (loc.hasCoords) return LatLng(loc.coords!.lat, loc.coords!.lng);
    return null;
  }

  Future<void> _confirm() async {
    if (_picked == null) return;
    if (widget.pickMode) {
      if (mounted) context.pop(_picked);
      return;
    }
    await ref.read(locationProvider.notifier).applyPicked(_picked!, mode: 'manual');
    if (mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final picked = _picked;

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  _roundIconButton(Icons.close, () {
                    if (widget.pickMode) {
                      context.pop();
                    } else {
                      context.go('/');
                    }
                  }),
                  const SizedBox(width: 12),
                  const Text('Map', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const Divider(height: 1, color: GetGasColors.border),
            Expanded(
              child: GoogleMapLocationPicker(
                initial: _initial,
                onLocationChanged: (loc) => setState(() => _picked = loc),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: GetGasColors.bgCard,
                border: Border(top: BorderSide(color: GetGasColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Delivery Location', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: GetGasColors.textMuted)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: GetGasColors.bgCard2,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: GetGasColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: GetGasColors.brand),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            picked?.formatted ?? 'Tap the map or search for your address',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: 'Continue',
                    showArrow: true,
                    onPressed: picked == null ? null : _confirm,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _roundIconButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: GetGasColors.bgCard2,
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(width: 36, height: 36, child: Icon(icon, size: 20, color: GetGasColors.text)),
      ),
    );
  }
}
