import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../providers/home_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final riderAsync = ref.watch(riderProfileProvider);

    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: riderAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: GetGasColors.brand)),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: GetGasColors.bgCard2, borderRadius: BorderRadius.circular(20)),
                  child: const Icon(Icons.wifi_off_rounded, size: 30, color: GetGasColors.textMuted),
                ),
                const SizedBox(height: 16),
                const Text('Could not load profile',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () => ref.invalidate(riderProfileProvider),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Try Again'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GetGasColors.brand,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ),
        data: (rider) => ListView(
          padding: EdgeInsets.zero,
          children: [
            // ── Hero ──────────────────────────────────────────────────────
            Container(
              color: GetGasColors.brand,
              child: SafeArea(
                bottom: false,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                      child: Column(
                        children: [
                          // Avatar
                          Container(
                            width: 80, height: 80,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.4),
                                  width: 2),
                            ),
                            child: Center(
                              child: Text(
                                rider.name.isNotEmpty
                                    ? rider.name[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                    fontSize: 34,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(rider.name,
                              style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white)),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.phone_outlined,
                                  size: 13,
                                  color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(rider.phone,
                                  style: const TextStyle(
                                      fontSize: 13, color: Colors.white70)),
                            ],
                          ),
                          const SizedBox(height: 20),
                          // Stats row
                          Container(
                            padding: const EdgeInsets.symmetric(
                                vertical: 14, horizontal: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                _HeroStat(
                                  value: rider.ratingAvg != null
                                      ? rider.ratingAvg!.toStringAsFixed(1)
                                      : '—',
                                  label: 'Rating',
                                  icon: Icons.star_rounded,
                                ),
                                _Divider(),
                                _HeroStat(
                                  value: '${rider.totalTrips ?? 0}',
                                  label: 'Trips',
                                  icon: Icons.two_wheeler_rounded,
                                ),
                                _Divider(),
                                _HeroStat(
                                  value: 'GHS ${(rider.totalEarnings ?? 0).toStringAsFixed(0)}',
                                  label: 'Earned',
                                  icon: Icons.account_balance_wallet_outlined,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── Body ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // KYC
                  _KycCard(
                      status: rider.kycStatus,
                      rejectionReason: rider.kycRejectionReason),
                  const SizedBox(height: 12),

                  // Vehicle
                  if (rider.vehicleType != null) ...[
                    _ProfileCard(
                      icon: Icons.two_wheeler_rounded,
                      iconColor: GetGasColors.brand,
                      title: rider.vehicleType!
                          .replaceAll('_', ' ')
                          .split(' ')
                          .map((w) => w.isEmpty
                              ? ''
                              : w[0].toUpperCase() + w.substring(1))
                          .join(' '),
                      subtitle: rider.vehiclePlate ?? 'No plate registered',
                      label: 'Vehicle',
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Payout account
                  _ProfileCard(
                    icon: Icons.account_balance_outlined,
                    iconColor: const Color(0xFF2563EB),
                    title: rider.bankAccount != null
                        ? rider.bankAccount!.provider.toUpperCase()
                        : 'Not connected',
                    subtitle: rider.bankAccount != null
                        ? rider.bankAccount!.accountNumber
                        : 'Add your mobile money account',
                    label: 'Payout Account',
                  ),
                  const SizedBox(height: 28),

                  // Sign out
                  OutlinedButton.icon(
                    onPressed: () => _confirmSignOut(context, ref),
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    label: const Text('Sign Out'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: GetGasColors.error,
                      side: BorderSide(
                          color: GetGasColors.error.withValues(alpha: 0.5)),
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      textStyle: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmSignOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sign Out',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(authProvider.notifier).logout();
    if (context.mounted) context.go('/login');
  }
}

// ── Hero stat ─────────────────────────────────────────────────────────────────

class _HeroStat extends StatelessWidget {
  const _HeroStat({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value, label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 18, color: Colors.white70),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          Text(label,
              style: const TextStyle(fontSize: 11, color: Colors.white70)),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
        width: 1,
        height: 36,
        color: Colors.white.withValues(alpha: 0.25));
  }
}

// ── Profile card ──────────────────────────────────────────────────────────────

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.label,
  });

  final IconData icon;
  final Color iconColor;
  final String title, subtitle, label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: GetGasColors.textMuted)),
                const SizedBox(height: 2),
                Text(title,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 12, color: GetGasColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── KYC card ──────────────────────────────────────────────────────────────────

class _KycCard extends StatelessWidget {
  const _KycCard({required this.status, this.rejectionReason});
  final String? status;
  final String? rejectionReason;

  @override
  Widget build(BuildContext context) {
    final approved = status == 'approved';
    final pending = status == 'pending';

    final bg = approved
        ? const Color(0xFFF0FDF4)
        : pending
            ? const Color(0xFFFEF3C7)
            : const Color(0xFFFEF2F2);
    final borderColor = approved
        ? const Color(0xFFBBF7D0)
        : pending
            ? const Color(0xFFFDE68A)
            : const Color(0xFFFECACA);
    final color = approved
        ? const Color(0xFF16A34A)
        : pending
            ? const Color(0xFFD97706)
            : GetGasColors.error;
    final icon = approved
        ? Icons.verified_rounded
        : pending
            ? Icons.hourglass_top_rounded
            : Icons.cancel_rounded;
    final label = approved
        ? 'KYC Verified'
        : pending
            ? 'Under Review'
            : 'KYC Rejected';
    final sub = approved
        ? 'Your identity has been verified'
        : pending
            ? "You'll be notified within 24 hours"
            : rejectionReason ?? 'Please resubmit your documents';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Icon(icon, size: 28, color: color),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: color)),
                const SizedBox(height: 2),
                Text(sub,
                    style: TextStyle(fontSize: 12, color: color)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
