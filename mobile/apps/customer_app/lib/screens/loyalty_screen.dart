import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';

import '../providers/api_providers.dart';
import '../widgets/sub_page_scaffold.dart';

class LoyaltyScreen extends ConsumerStatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  ConsumerState<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends ConsumerState<LoyaltyScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final loyaltyAsync = ref.watch(_loyaltyProvider);
    final referralAsync = ref.watch(_referralProvider);

    return SubPageScaffold(
      title: 'Rewards & Referrals',
      subtitle: 'Earn points and refer friends',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                _tabBtn(0, Icons.star_outline, 'Points'),
                const SizedBox(width: 8),
                _tabBtn(1, Icons.people_outline, 'Referrals'),
              ],
            ),
          ),
          Expanded(
            child: _tab == 0
                ? loyaltyAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
                    error: (_, __) => const Center(child: Text('Could not load points')),
                    data: (data) => _pointsTab(data),
                  )
                : referralAsync.when(
                    loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
                    error: (_, __) => const Center(child: Text('Could not load referral info')),
                    data: (data) => _referralTab(data),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _tabBtn(int index, IconData icon, String label) {
    final selected = _tab == index;
    return Expanded(
      child: Material(
        color: selected ? GetGasColors.brand.withValues(alpha: 0.12) : GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => setState(() => _tab = index),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: selected ? GetGasColors.brand : GetGasColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: selected ? GetGasColors.brand : GetGasColors.textMuted),
                const SizedBox(width: 6),
                Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? GetGasColors.brand : GetGasColors.textMuted)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _pointsTab(LoyaltyData data) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _card(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 28),
                  const SizedBox(width: 8),
                  Text('${data.balance}', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
                ],
              ),
              const Text('Available Points', style: TextStyle(color: GetGasColors.textMuted)),
              const SizedBox(height: 4),
              Text('GHS ${(data.balance / 100).floor()} discount available', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('How Points Work', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _step('1', 'Earn Points', '1 point per GHS 1 spent'),
              _step('2', 'Redeem Rewards', '100 points = GHS 1 discount'),
              _step('3', 'Bonus Points', '200 points per successful referral'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Recent Activity', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              if (data.transactions.isEmpty)
                const Text('No transactions yet. Start ordering to earn points!', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13))
              else
                ...data.transactions.take(5).map((t) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.description, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                if (t.createdAt != null)
                                  Text(t.createdAt!, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                              ],
                            ),
                          ),
                          Text(
                            '${t.points > 0 ? '+' : ''}${t.points}',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: t.points > 0 ? Colors.green : Colors.red,
                            ),
                          ),
                        ],
                      ),
                    )),
            ],
          ),
        ),
      ],
    );
  }

  Widget _referralTab(ReferralData data) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: _statCard('${data.referralCount}', 'Friends Referred')),
            const SizedBox(width: 12),
            Expanded(child: _statCard('GHS ${data.referralCount * 2}', 'Bonus Earned')),
          ],
        ),
        const SizedBox(height: 16),
        _card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Your Referral Code', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: GetGasColors.brand.withValues(alpha: 0.4), width: 2, style: BorderStyle.solid),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  data.referralCode.isEmpty ? '—' : data.referralCode,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: GetGasColors.brand, letterSpacing: 2),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: data.referralCode.isEmpty
                          ? null
                          : () {
                              Clipboard.setData(ClipboardData(text: data.referralCode));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Referral code copied')),
                              );
                            },
                      icon: const Icon(Icons.copy, size: 16),
                      label: const Text('Copy Code'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: PrimaryButton(
                      label: 'Share',
                      onPressed: data.shareUrl.isEmpty
                          ? null
                          : () {
                              Clipboard.setData(ClipboardData(
                                text: 'Join GetGas with my code ${data.referralCode}: ${data.shareUrl}',
                              ));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Referral link copied')),
                              );
                            },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: child,
    );
  }

  Widget _statCard(String value, String label) {
    return _card(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: GetGasColors.brand)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _step(String n, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: GetGasColors.brand.withValues(alpha: 0.12),
            child: Text(n, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: GetGasColors.brand)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final _loyaltyProvider = FutureProvider<LoyaltyData>((ref) {
  return ref.watch(usersApiProvider).getLoyalty();
});

final _referralProvider = FutureProvider<ReferralData>((ref) {
  return ref.watch(usersApiProvider).getReferral();
});
