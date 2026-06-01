import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

enum LocationDisplayState { detecting, granted, denied, manual }

class HomeHeader extends StatelessWidget {
  const HomeHeader({
    super.key,
    required this.locationLabel,
    required this.locationState,
    required this.hasCoords,
    required this.unreadCount,
    required this.onLocationTap,
    this.onNotificationsTap,
  });

  final String locationLabel;
  final LocationDisplayState locationState;
  final bool hasCoords;
  final int unreadCount;
  final VoidCallback onLocationTap;
  final VoidCallback? onNotificationsTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Current location',
                  style: TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                ),
                const SizedBox(height: 4),
                Material(
                  color: GetGasColors.bgCard,
                  borderRadius: BorderRadius.circular(999),
                  child: InkWell(
                    onTap: onLocationTap,
                    borderRadius: BorderRadius.circular(999),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: GetGasColors.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _locationIcon(),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              _labelText(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: GetGasColors.text,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.keyboard_arrow_down, size: 14, color: GetGasColors.textMuted),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _IconButton(
            icon: Icons.notifications_outlined,
            badge: unreadCount,
            onTap: onNotificationsTap,
          ),
        ],
      ),
    );
  }

  String _labelText() {
    if (locationState == LocationDisplayState.detecting && !hasCoords) return 'Detecting…';
    if (locationState == LocationDisplayState.denied) return 'Set location';
    return locationLabel.isEmpty ? 'Detecting…' : locationLabel;
  }

  Widget _locationIcon() {
    switch (locationState) {
      case LocationDisplayState.detecting:
        return const SizedBox(
          width: 14,
          height: 14,
          child: CircularProgressIndicator(strokeWidth: 2, color: GetGasColors.textMuted),
        );
      case LocationDisplayState.denied:
        return const Icon(Icons.error_outline, size: 14, color: Color(0xFFF59E0B));
      default:
        return const Icon(Icons.location_on, size: 14, color: GetGasColors.brand);
    }
  }
}

class _IconButton extends StatelessWidget {
  const _IconButton({required this.icon, this.badge = 0, this.onTap});

  final IconData icon;
  final int badge;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: GetGasColors.bgCard,
          shape: const CircleBorder(side: BorderSide(color: GetGasColors.border)),
          child: InkWell(
            onTap: onTap,
            customBorder: const CircleBorder(),
            child: SizedBox(
              width: 36,
              height: 36,
              child: Icon(icon, size: 16, color: GetGasColors.textMuted),
            ),
          ),
        ),
        if (badge > 0)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              width: 16,
              height: 16,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: GetGasColors.brand,
                shape: BoxShape.circle,
              ),
              child: Text(
                badge > 9 ? '9+' : '$badge',
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class RadiusFilterChips extends StatelessWidget {
  const RadiusFilterChips({
    super.key,
    required this.radius,
    required this.onChanged,
  });

  final int radius;
  final ValueChanged<int> onChanged;

  static const options = [5, 10, 25];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.tune, size: 14, color: GetGasColors.textMuted),
        const SizedBox(width: 8),
        ...options.map((r) {
          final selected = r == radius;
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Material(
              color: selected ? GetGasColors.brand : GetGasColors.bgCard,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                onTap: () => onChanged(r),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: selected ? GetGasColors.brand : GetGasColors.border,
                    ),
                  ),
                  child: Text(
                    '$r km',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : GetGasColors.textMuted,
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}
