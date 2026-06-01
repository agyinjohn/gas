import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../providers/user_profile_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/auth_provider.dart';

/// Profile — mirrors web `/user/profile`.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _showSignOutConfirm = false;
  bool _showAddressForm = false;
  SavedAddress? _editingAddress;
  String _label = 'Home';
  String _street = '';
  String _city = '';
  double _lat = 0;
  double _lng = 0;
  bool _isDefault = false;
  bool _saving = false;

  static const _labels = ['Home', 'Work', 'Other'];

  void _openAdd(List<SavedAddress> addresses) {
    setState(() {
      _editingAddress = null;
      _label = 'Home';
      _street = '';
      _city = '';
      _lat = 0;
      _lng = 0;
      _isDefault = addresses.isEmpty;
      _showAddressForm = true;
    });
  }

  void _openEdit(SavedAddress addr) {
    setState(() {
      _editingAddress = addr;
      _label = addr.label;
      _street = addr.street;
      _city = addr.city;
      _lat = addr.lat;
      _lng = addr.lng;
      _isDefault = addr.isDefault;
      _showAddressForm = true;
    });
  }

  Future<void> _pickOnMap() async {
    final picked = await context.push<PickedLocation>('/location?pick=1');
    if (picked == null || !mounted) return;
    setState(() {
      _street = picked.street.isNotEmpty ? picked.street : picked.formatted;
      _city = picked.city.isNotEmpty ? picked.city : 'Ghana';
      _lat = picked.lat;
      _lng = picked.lng;
    });
  }

  Future<void> _saveAddress() async {
    if (_street.isEmpty || _lat == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please pick a location on the map')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      if (_editingAddress != null) {
        await ref.read(usersApiProvider).updateAddress(
              _editingAddress!.id,
              label: _label,
              street: _street,
              city: _city,
              lat: _lat,
              lng: _lng,
              isDefault: _isDefault,
            );
      } else {
        await ref.read(usersApiProvider).addAddress(
              label: _label,
              street: _street,
              city: _city,
              lat: _lat,
              lng: _lng,
              isDefault: _isDefault,
            );
      }
      ref.invalidate(userProfileProvider);
      if (mounted) setState(() => _showAddressForm = false);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteAddress(String id) async {
    try {
      await ref.read(usersApiProvider).deleteAddress(id);
      ref.invalidate(userProfileProvider);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _setDefault(String id) async {
    try {
      await ref.read(usersApiProvider).updateAddress(id, isDefault: true);
      ref.invalidate(userProfileProvider);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authUser = ref.watch(authProvider).user;
    final profileAsync = ref.watch(userProfileProvider);
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return Stack(
      children: [
        Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 48, 16, 20),
              decoration: const BoxDecoration(
                color: GetGasColors.bgCard,
                border: Border(bottom: BorderSide(color: GetGasColors.border)),
              ),
              child: profileAsync.when(
                loading: () => _headerSkeleton(authUser),
                error: (_, __) => _header(authUser, null),
                data: (profile) => _header(authUser, profile),
              ),
            ),
            Expanded(
              child: profileAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
                error: (_, __) => const Center(child: Text('Could not load profile')),
                data: (profile) => ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                  children: [
                    if (_showAddressForm) ...[
                      _addressFormCard(),
                      const SizedBox(height: 16),
                    ],
                    _addressesSection(profile.savedAddresses),
                    const SizedBox(height: 16),
                    _ProfileTile(icon: Icons.receipt_long_outlined, label: 'Order History', onTap: () => context.go('/orders')),
                    _ProfileTile(icon: Icons.schedule, label: 'Scheduled Orders', onTap: () => context.push('/scheduled')),
                    _ProfileTile(icon: Icons.help_outline, label: 'Help & Support', onTap: () => context.push('/help')),
                    _ProfileTile(icon: Icons.description_outlined, label: 'Terms of Service', onTap: () => context.push('/terms')),
                    _ProfileTile(icon: Icons.shield_outlined, label: 'Privacy Policy', onTap: () => context.push('/privacy')),
                    const SizedBox(height: 12),
                    _themeTile(isDark),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () => setState(() => _showSignOutConfirm = true),
                      icon: const Icon(Icons.logout, size: 18, color: GetGasColors.error),
                      label: const Text('Sign out', style: TextStyle(color: GetGasColors.error)),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: GetGasColors.error.withValues(alpha: 0.3)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Center(child: Text('GetGas v1.0.0', style: TextStyle(fontSize: 11, color: GetGasColors.textMuted))),
                  ],
                ),
              ),
            ),
          ],
        ),
        if (_showSignOutConfirm) _signOutDialog(),
      ],
    );
  }

  Widget _header(AuthUser? authUser, UserProfile? profile) {
    final name = profile?.name ?? authUser?.name ?? 'User';
    final phone = profile?.phone ?? authUser?.phone ?? '';
    final initials = name.split(' ').where((s) => s.isNotEmpty).map((s) => s[0]).take(2).join().toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('My Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: GetGasColors.brand,
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Text(initials.isEmpty ? 'U' : initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                  if (phone.isNotEmpty && !phone.startsWith('google_'))
                    Text(phone, style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted)),
                ],
              ),
            ),
          ],
        ),
        if (profile != null) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _statBox('${profile.totalOrders}', 'Orders', GetGasColors.brand)),
              const SizedBox(width: 12),
              Expanded(child: _statBox('${profile.loyaltyPoints}', 'Points', Colors.amber)),
            ],
          ),
        ],
      ],
    );
  }

  Widget _headerSkeleton(AuthUser? authUser) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('My Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Text(authUser?.name ?? 'User', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      ],
    );
  }

  Widget _statBox(String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
        ],
      ),
    );
  }

  Widget _addressesSection(List<SavedAddress> addresses) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(child: Text('Saved Addresses', style: TextStyle(fontWeight: FontWeight.w700))),
              if (!_showAddressForm)
                TextButton.icon(
                  onPressed: () => _openAdd(addresses),
                  icon: const Icon(Icons.add, size: 16, color: GetGasColors.brand),
                  label: const Text('Add', style: TextStyle(color: GetGasColors.brand, fontWeight: FontWeight.w600)),
                ),
            ],
          ),
          if (addresses.isEmpty && !_showAddressForm)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.location_on_outlined, size: 32, color: GetGasColors.textMuted.withValues(alpha: 0.5)),
                    const SizedBox(height: 8),
                    const Text('No saved addresses', style: TextStyle(color: GetGasColors.textMuted)),
                    TextButton(onPressed: () => _openAdd(addresses), child: const Text('+ Add address')),
                  ],
                ),
              ),
            )
          else
            ...addresses.map((addr) => _addressRow(addr)),
        ],
      ),
    );
  }

  Widget _addressRow(SavedAddress addr) {
    IconData icon = Icons.location_on_outlined;
    final l = addr.label.toLowerCase();
    if (l.contains('home')) icon = Icons.home_outlined;
    if (l.contains('work')) icon = Icons.business_outlined;

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: GetGasColors.brand, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(addr.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (addr.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: GetGasColors.brand.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text('Default', style: TextStyle(fontSize: 10, color: GetGasColors.brand, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
                Text('${addr.street}, ${addr.city}', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          if (!addr.isDefault)
            IconButton(
              icon: const Icon(Icons.check_circle_outline, size: 18, color: Colors.green),
              onPressed: () => _setDefault(addr.id),
              tooltip: 'Set default',
            ),
          IconButton(icon: const Icon(Icons.edit_outlined, size: 18, color: GetGasColors.brand), onPressed: () => _openEdit(addr)),
          IconButton(icon: const Icon(Icons.delete_outline, size: 18, color: GetGasColors.error), onPressed: () => _deleteAddress(addr.id)),
        ],
      ),
    );
  }

  Widget _addressFormCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.brand.withValues(alpha: 0.3), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(_editingAddress != null ? 'Edit Address' : 'New Address', style: const TextStyle(fontWeight: FontWeight.w700))),
              IconButton(onPressed: () => setState(() => _showAddressForm = false), icon: const Icon(Icons.close, size: 18)),
            ],
          ),
          Row(
            children: _labels.map((l) {
              final selected = _label == l;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: l == _labels.last ? 0 : 8),
                  child: OutlinedButton(
                    onPressed: () => setState(() => _label = l),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: selected ? GetGasColors.brand : GetGasColors.textMuted,
                      backgroundColor: selected ? GetGasColors.brand.withValues(alpha: 0.08) : null,
                      side: BorderSide(color: selected ? GetGasColors.brand : GetGasColors.border),
                    ),
                    child: Text(l, style: const TextStyle(fontSize: 12)),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Material(
            color: _lat != 0 ? GetGasColors.brand.withValues(alpha: 0.08) : GetGasColors.bgCard2,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: _pickOnMap,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _lat != 0 ? GetGasColors.brand : GetGasColors.border, style: _lat != 0 ? BorderStyle.solid : BorderStyle.solid),
                ),
                child: Row(
                  children: [
                    Icon(Icons.map_outlined, color: _lat != 0 ? GetGasColors.brand : GetGasColors.textMuted),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _lat != 0 ? '$_street, $_city' : 'Pick location on map',
                        style: TextStyle(fontWeight: FontWeight.w600, color: _lat != 0 ? GetGasColors.text : GetGasColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          CheckboxListTile(
            value: _isDefault,
            onChanged: (v) => setState(() => _isDefault = v ?? false),
            title: const Text('Set as default address', style: TextStyle(fontSize: 14)),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(onPressed: () => setState(() => _showAddressForm = false), child: const Text('Cancel')),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: PrimaryButton(label: _editingAddress != null ? 'Update' : 'Save', loading: _saving, onPressed: _saving ? null : _saveAddress),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _themeTile(bool isDark) {
    return Material(
      color: GetGasColors.bgCard,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => ref.read(themeModeProvider.notifier).toggle(),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: GetGasColors.border),
          ),
          child: Row(
            children: [
              Icon(isDark ? Icons.light_mode : Icons.dark_mode, color: GetGasColors.textMuted),
              const SizedBox(width: 12),
              Expanded(child: Text(isDark ? 'Light Mode' : 'Dark Mode', style: const TextStyle(fontWeight: FontWeight.w500))),
              Switch(value: isDark, onChanged: (_) => ref.read(themeModeProvider.notifier).toggle(), activeThumbColor: GetGasColors.brand),
            ],
          ),
        ),
      ),
    );
  }

  Widget _signOutDialog() {
    return Positioned.fill(
      child: Material(
        color: Colors.black54,
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: GetGasColors.bgCard,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Sign out?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 8),
                const Text('You will need to sign in again to place orders.', style: TextStyle(color: GetGasColors.textMuted, fontSize: 13)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: OutlinedButton(onPressed: () => setState(() => _showSignOutConfirm = false), child: const Text('Cancel'))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: PrimaryButton(
                        label: 'Sign out',
                        onPressed: () {
                          ref.read(authProvider.notifier).logout();
                          context.go('/login');
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: GetGasColors.border),
            ),
            child: Row(
              children: [
                Icon(icon, size: 20, color: GetGasColors.textMuted),
                const SizedBox(width: 12),
                Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
                const Icon(Icons.chevron_right, size: 18, color: GetGasColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
