import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:fl_chart/fl_chart.dart';

import '../providers/api_providers.dart';
import '../providers/home_providers.dart';
import '../services/cache_service.dart';

enum _Tab { overview, payouts, bank }

const _momoProviders = [
  (value: 'mtn', label: 'MTN Mobile Money'),
  (value: 'vod', label: 'Vodafone Cash'),
  (value: 'tgo', label: 'AirtelTigo Money'),
];

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  _Tab _tab = _Tab.overview;

  String _provider = '';
  final _accountNumber = TextEditingController();
  final _accountName = TextEditingController();
  bool _savingBank = false;
  String? _bankError;

  @override
  void dispose() {
    _accountNumber.dispose();
    _accountName.dispose();
    super.dispose();
  }

  Future<void> _saveBank() async {
    if (_provider.isEmpty || _accountNumber.text.isEmpty || _accountName.text.isEmpty) {
      setState(() => _bankError = 'Please fill all fields');
      return;
    }
    setState(() { _savingBank = true; _bankError = null; });
    try {
      await ref.read(ridersApiProvider).updateBankAccount(RiderBankAccount(
            provider: _provider,
            accountNumber: _accountNumber.text.trim(),
            accountName: _accountName.text.trim(),
          ));
      ref.invalidate(riderProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Bank account updated')),
        );
      }
    } catch (e) {
      setState(() => _bankError = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _savingBank = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: GetGasColors.bg,
      body: Column(
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            color: GetGasColors.brand,
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Earnings',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
                        const SizedBox(height: 2),
                        Text('Track your income and manage payouts',
                            style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.75))),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          _TabBtn(label: 'Overview',     icon: Icons.trending_up_rounded,     active: _tab == _Tab.overview, onTap: () => setState(() => _tab = _Tab.overview)),
                          _TabBtn(label: 'Payouts',      icon: Icons.credit_card_outlined,     active: _tab == _Tab.payouts,  onTap: () => setState(() => _tab = _Tab.payouts)),
                          _TabBtn(label: 'Bank Account', icon: Icons.account_balance_outlined, active: _tab == _Tab.bank,     onTap: () => setState(() => _tab = _Tab.bank)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // ── Body ────────────────────────────────────────────────────────
          Expanded(
            child: switch (_tab) {
              _Tab.overview => _OverviewTab(),
              _Tab.payouts  => _PayoutsTab(),
              _Tab.bank     => _BankTab(
                  provider: _provider,
                  accountNumber: _accountNumber,
                  accountName: _accountName,
                  saving: _savingBank,
                  error: _bankError,
                  onProvider: (v) => setState(() { _provider = v; _bankError = null; }),
                  onSave: _saveBank,
                ),
            },
          ),
        ],
      ),
    );
  }
}

// ── Tab button ────────────────────────────────────────────────────────────────

class _TabBtn extends StatelessWidget {
  const _TabBtn({required this.label, required this.icon, required this.active, required this.onTap});
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: active ? GetGasColors.brand : Colors.white.withValues(alpha: 0.8)),
              const SizedBox(height: 3),
              Text(label,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                      color: active ? GetGasColors.brand : Colors.white.withValues(alpha: 0.8)),
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Overview tab ──────────────────────────────────────────────────────────────

class _OverviewTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync    = ref.watch(riderDashboardProvider);
    final payoutsAsync = ref.watch(_payoutsProvider);

    return dashAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
      error: (_, __) => _ErrorView(
        message: 'Could not load earnings',
        onRetry: () => ref.invalidate(riderDashboardProvider),
      ),
      data: (dash) {
        final avgPerTrip = dash.totalTrips > 0 ? dash.totalEarnings / dash.totalTrips : 0.0;
        final weeklyEst  = dash.todayEarnings * 7;

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
          children: [
            // Today hero card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: GetGasColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52, height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.trending_up_rounded, size: 26, color: Color(0xFF16A34A)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Today's Earnings",
                            style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                        Text('GHS ${dash.todayEarnings.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900,
                                color: Color(0xFF16A34A))),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      '${dash.todayTrips} trip${dash.todayTrips == 1 ? '' : 's'}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                          color: Color(0xFF16A34A)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 7-day bar chart
            payoutsAsync.when(
              loading: () => Container(
                height: 200,
                decoration: BoxDecoration(
                  color: GetGasColors.bgCard2,
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              error: (_, __) => const SizedBox.shrink(),
              data: (payouts) => _EarningsChart(payouts: payouts),
            ),
            const SizedBox(height: 14),

            // Stats grid
            Row(children: [
              _StatCard(icon: Icons.calendar_today_outlined, iconColor: const Color(0xFF8B5CF6),
                  label: 'This Week (Est.)', value: 'GHS ${weeklyEst.toStringAsFixed(2)}'),
              const SizedBox(width: 12),
              _StatCard(icon: Icons.account_balance_wallet_outlined, iconColor: const Color(0xFF16A34A),
                  label: 'All-time Earned', value: 'GHS ${dash.totalEarnings.toStringAsFixed(2)}'),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              _StatCard(icon: Icons.two_wheeler_rounded, iconColor: GetGasColors.brand,
                  label: 'Total Trips', value: '${dash.totalTrips}'),
              const SizedBox(width: 12),
              _StatCard(icon: Icons.bar_chart_rounded, iconColor: const Color(0xFF3B82F6),
                  label: 'Avg per Trip', value: 'GHS ${avgPerTrip.toStringAsFixed(2)}'),
            ]),

            // Rating card
            if (dash.ratingAvg != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: GetGasColors.bgCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: GetGasColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.star_rounded, size: 22, color: Color(0xFFF59E0B)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Customer Rating',
                              style: TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
                          Text(dash.ratingAvg!.toStringAsFixed(1),
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900,
                                  color: Color(0xFFF59E0B))),
                        ],
                      ),
                    ),
                    Row(
                      children: List.generate(5, (i) => Icon(
                        i < dash.ratingAvg!.round() ? Icons.star_rounded : Icons.star_outline_rounded,
                        size: 18,
                        color: i < dash.ratingAvg!.round() ? const Color(0xFFF59E0B) : GetGasColors.border,
                      )),
                    ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

// ── 7-day earnings bar chart ──────────────────────────────────────────────────

class _EarningsChart extends StatelessWidget {
  const _EarningsChart({required this.payouts});
  final List<RiderPayout> payouts;

  List<double> _dailyTotals() {
    final now    = DateTime.now();
    final totals = List<double>.filled(7, 0);
    for (final p in payouts) {
      if (p.status != 'completed') continue;
      final date = DateTime.tryParse(p.createdAt);
      if (date == null) continue;
      final diff = now.difference(date).inDays;
      if (diff < 0 || diff > 6) continue;
      totals[6 - diff] += p.amountGHS.toDouble();
    }
    return totals;
  }

  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  String _dayLabel(int index) {
    final date = DateTime.now().subtract(Duration(days: 6 - index));
    return _days[date.weekday - 1];
  }

  @override
  Widget build(BuildContext context) {
    final totals    = _dailyTotals();
    final maxVal    = totals.reduce((a, b) => a > b ? a : b);
    final weekTotal = totals.reduce((a, b) => a + b);
    final hasData   = maxVal > 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Last 7 Days', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  Text('Completed payouts', style: TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: GetGasColors.brand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('GHS ${weekTotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
                        color: GetGasColors.brand)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (!hasData)
            const SizedBox(
              height: 100,
              child: Center(
                child: Text('No completed payouts in the last 7 days',
                    style: TextStyle(fontSize: 13, color: GetGasColors.textMuted),
                    textAlign: TextAlign.center),
              ),
            )
          else
            SizedBox(
              height: 140,
              child: BarChart(
                BarChartData(
                  maxY: maxVal * 1.3,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: maxVal / 4,
                    getDrawingHorizontalLine: (_) =>
                        const FlLine(color: GetGasColors.border, strokeWidth: 1),
                  ),
                  borderData: FlBorderData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles:    const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) => Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(_dayLabel(v.toInt()),
                              style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted)),
                        ),
                      ),
                    ),
                  ),
                  barGroups: List.generate(7, (i) => BarChartGroupData(
                    x: i,
                    barRods: [
                      BarChartRodData(
                        toY: totals[i],
                        color: i == 6
                            ? GetGasColors.brand
                            : GetGasColors.brand.withValues(alpha: 0.35),
                        width: 20,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                      ),
                    ],
                  )),
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => GetGasColors.text,
                      getTooltipItem: (_, __, rod, ___) => BarTooltipItem(
                        'GHS ${rod.toY.toStringAsFixed(2)}',
                        const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.iconColor, required this.label, required this.value});
  final IconData icon;
  final Color iconColor;
  final String label, value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: GetGasColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(label, style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Payouts tab ───────────────────────────────────────────────────────────────

class _PayoutsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payoutsAsync = ref.watch(_payoutsProvider);

    return payoutsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
      error: (_, __) => _ErrorView(
        message: 'Could not load payouts',
        onRetry: () => ref.invalidate(_payoutsProvider),
      ),
      data: (payouts) {
        final completed = payouts.where((p) => p.status == 'completed').length;
        final pending   = payouts.where((p) => p.status == 'pending').length;
        final failed    = payouts.where((p) => p.status == 'failed').length;

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: GetGasColors.bgCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: GetGasColors.border),
              ),
              child: Row(
                children: [
                  _PayoutStat(label: 'Completed', value: '$completed', color: const Color(0xFF16A34A)),
                  _VertDivider(),
                  _PayoutStat(label: 'Pending',   value: '$pending',   color: const Color(0xFFF59E0B)),
                  _VertDivider(),
                  _PayoutStat(label: 'Failed',    value: '$failed',    color: GetGasColors.error),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (payouts.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 48),
                  child: Column(
                    children: [
                      Container(
                        width: 64, height: 64,
                        decoration: BoxDecoration(
                          color: GetGasColors.bgCard2,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(Icons.credit_card_outlined, size: 32, color: GetGasColors.textMuted),
                      ),
                      const SizedBox(height: 14),
                      const Text('No payouts yet',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      const Text('Complete your first delivery to see payouts here',
                          style: TextStyle(fontSize: 13, color: GetGasColors.textMuted),
                          textAlign: TextAlign.center),
                    ],
                  ),
                ),
              )
            else
              ...payouts.map((p) => _PayoutCard(payout: p)),
          ],
        );
      },
    );
  }
}

class _VertDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
      width: 1, height: 32, color: GetGasColors.border,
      margin: const EdgeInsets.symmetric(horizontal: 8));
}

class _PayoutStat extends StatelessWidget {
  const _PayoutStat({required this.label, required this.value, required this.color});
  final String label, value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
        ],
      ),
    );
  }
}

class _PayoutCard extends StatelessWidget {
  const _PayoutCard({required this.payout});
  final RiderPayout payout;

  static const _statusColors = {
    'completed':  Color(0xFF16A34A),
    'pending':    Color(0xFFF59E0B),
    'processing': Color(0xFF3B82F6),
    'failed':     GetGasColors.error,
  };
  static const _statusBgs = {
    'completed':  Color(0xFFDCFCE7),
    'pending':    Color(0xFFFEF3C7),
    'processing': Color(0xFFEFF6FF),
    'failed':     GetGasColors.errorBg,
  };
  static const _statusIcons = {
    'completed':  Icons.check_circle_rounded,
    'pending':    Icons.hourglass_top_rounded,
    'processing': Icons.sync_rounded,
    'failed':     Icons.cancel_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final color    = _statusColors[payout.status] ?? GetGasColors.textMuted;
    final bg       = _statusBgs[payout.status]    ?? GetGasColors.bgCard2;
    final icon     = _statusIcons[payout.status]  ?? Icons.circle_outlined;
    final date     = DateTime.tryParse(payout.createdAt);
    final timeLabel = date != null ? _timeAgo(date) : '';
    final shortId  = payout.orderId != null
        ? '#${payout.orderId!.length >= 6 ? payout.orderId!.substring(payout.orderId!.length - 6).toUpperCase() : payout.orderId!.toUpperCase()}'
        : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('GHS ${payout.amountGHS.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                Text(shortId.isNotEmpty ? 'Order $shortId · $timeLabel' : timeLabel,
                    style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
            child: Text(payout.status,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)   return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ── Bank tab ──────────────────────────────────────────────────────────────────

class _BankTab extends ConsumerWidget {
  const _BankTab({
    required this.provider, required this.accountNumber,
    required this.accountName, required this.saving,
    required this.error, required this.onProvider, required this.onSave,
  });

  final String provider;
  final TextEditingController accountNumber, accountName;
  final bool saving;
  final String? error;
  final ValueChanged<String> onProvider;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final existing = ref.watch(riderProfileProvider).valueOrNull?.bankAccount;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
      children: [
        // Status banner
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: existing != null ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: existing != null ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A),
            ),
          ),
          child: Row(
            children: [
              Icon(
                existing != null ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                size: 24,
                color: existing != null ? const Color(0xFF16A34A) : const Color(0xFFF59E0B),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: existing != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Account Connected',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                                  color: Color(0xFF14532D))),
                          const SizedBox(height: 4),
                          Text('${existing.provider.toUpperCase()} · ${existing.accountNumber}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF16A34A))),
                        ],
                      )
                    : const Text('Add your mobile money account to receive payouts',
                        style: TextStyle(fontSize: 13, color: Color(0xFF92400E))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Form card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: GetGasColors.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: GetGasColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(existing != null ? 'Update Bank Account' : 'Add Bank Account',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),

              if (error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: GetGasColors.errorBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(error!, style: const TextStyle(fontSize: 12, color: GetGasColors.error)),
                ),
                const SizedBox(height: 12),
              ],

              _FieldLabel('Mobile Money Provider'),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: GetGasColors.bgCard,
                  border: Border.all(color: GetGasColors.border),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: provider.isEmpty ? null : provider,
                    hint: const Text('Select provider', style: TextStyle(color: GetGasColors.textMuted)),
                    isExpanded: true,
                    items: _momoProviders
                        .map((p) => DropdownMenuItem(value: p.value, child: Text(p.label)))
                        .toList(),
                    onChanged: (v) { if (v != null) onProvider(v); },
                  ),
                ),
              ),
              const SizedBox(height: 14),

              _FieldLabel('Phone Number'),
              const SizedBox(height: 6),
              _Field(controller: accountNumber, hint: '0244123456', type: TextInputType.phone),
              const SizedBox(height: 14),

              _FieldLabel('Account Name'),
              const SizedBox(height: 6),
              _Field(controller: accountName, hint: 'Full name as registered', type: TextInputType.name),
              const SizedBox(height: 20),

              ElevatedButton.icon(
                onPressed: saving ? null : onSave,
                icon: saving
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 18),
                label: Text('${existing != null ? 'Update' : 'Save'} Account'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: GetGasColors.brand,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 50),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Info card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFF1D4ED8)),
                  SizedBox(width: 6),
                  Text('Important Notes',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8))),
                ],
              ),
              const SizedBox(height: 10),
              for (final note in [
                'Payouts are processed automatically after each delivery',
                'Ensure your mobile money account is active and verified',
                'Contact support if you experience payout delays',
                'Account name must match your mobile money registration',
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('• ', style: TextStyle(color: Color(0xFF1D4ED8))),
                      Expanded(child: Text(note,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF1D4ED8)))),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: GetGasColors.text));
}

class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.hint, required this.type});
  final TextEditingController controller;
  final String hint;
  final TextInputType type;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: type,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: GetGasColors.textMuted),
        filled: true,
        fillColor: GetGasColors.bgCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: GetGasColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: GetGasColors.brand, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }
}

// ── Reusable error view ──────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: GetGasColors.bgCard2,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.wifi_off_rounded, size: 30, color: GetGasColors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(message,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
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
    );
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

final _payoutsProvider = FutureProvider<List<RiderPayout>>((ref) async {
  final cached = await CacheService.loadPayouts();
  if (cached != null) {
    ref.watch(ridersApiProvider).getPayouts().then((fresh) {
      CacheService.savePayouts(
        fresh.map((p) => {
          '_id': p.id,
          'amountGHS': p.amountGHS,
          'status': p.status,
          'createdAt': p.createdAt,
          if (p.orderId != null) 'orderId': p.orderId,
        }).toList(),
      );
      ref.invalidateSelf();
    }).catchError((_) {});
    return cached.map(RiderPayout.fromJson).toList();
  }
  try {
    final payouts = await ref.watch(ridersApiProvider).getPayouts();
    await CacheService.savePayouts(
      payouts.map((p) => {
        '_id': p.id,
        'amountGHS': p.amountGHS,
        'status': p.status,
        'createdAt': p.createdAt,
        if (p.orderId != null) 'orderId': p.orderId,
      }).toList(),
    );
    return payouts;
  } catch (_) {
    rethrow;
  }
});
