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
    _Tab(Icons.home_outlined, Icons.home_rounded, 'Home'),
    _Tab(Icons.receipt_long_outlined, Icons.receipt_long_rounded, 'Orders'),
    _Tab(Icons.location_on_outlined, Icons.location_on_rounded, 'Track'),
    _Tab(Icons.person_outline, Icons.person_rounded, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        border: const Border(top: BorderSide(color: GetGasColors.border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: List.generate(tabs.length, (i) {
              final tab = tabs[i];
              final active = i == currentIndex;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onTap(i),
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeInOut,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: active
                          ? GetGasColors.brand.withValues(alpha: 0.10)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: Icon(
                            active ? tab.activeIcon : tab.icon,
                            key: ValueKey(active),
                            size: 22,
                            color: active
                                ? GetGasColors.brand
                                : GetGasColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tab.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: active
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: active
                                ? GetGasColors.brand
                                : GetGasColors.textMuted,
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
