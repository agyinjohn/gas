import 'package:flutter/material.dart';

import '../../theme/getgas_colors.dart';

/// Mobile bottom tab bar — mirrors web `/user` layout bottom nav.
class UserBottomNav extends StatelessWidget {
  const UserBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const tabs = [
    _Tab(Icons.home_outlined, Icons.home, 'Home'),
    _Tab(Icons.receipt_long_outlined, Icons.receipt_long, 'Orders'),
    _Tab(Icons.location_on_outlined, Icons.location_on, 'Track'),
    _Tab(Icons.person_outline, Icons.person, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: GetGasColors.bgCard,
        border: Border(top: BorderSide(color: GetGasColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: List.generate(tabs.length, (i) {
            final tab = tabs[i];
            final active = i == currentIndex;
            return Expanded(
              child: InkWell(
                onTap: () => onTap(i),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        active ? tab.activeIcon : tab.icon,
                        size: 20,
                        color: active ? GetGasColors.brand : GetGasColors.textMuted,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        tab.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: active ? GetGasColors.brand : GetGasColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _Tab {
  const _Tab(this.icon, this.activeIcon, this.label);
  final IconData icon;
  final IconData activeIcon;
  final String label;
}
