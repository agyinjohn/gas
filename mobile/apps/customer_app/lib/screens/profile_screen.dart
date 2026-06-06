import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/api_providers.dart';
import '../providers/user_profile_provider.dart';
import '../providers/auth_provider.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _showSignOut   = false;
  bool _showAddrForm  = false;
  SavedAddress? _editingAddress;
  String _label    = 'Home';
  String _street   = '';
  String _city     = '';
  double _lat      = 0;
  double _lng      = 0;
  bool   _isDefault = false;
  bool   _saving    = false;

  static const _labels = ['Home', 'Work', 'Other'];

  void _openAdd(List<SavedAddress> addresses) => setState(() {
        _editingAddress = null;
        _label = 'Home'; _street = ''; _city = '';
        _lat = 0; _lng = 0;
        _isDefault = addresses.isEmpty;
        _showAddrForm = true;
      });

  void _openEdit(SavedAddress a) => setState(() {
        _editingAddress = a;
        _label = a.label; _street = a.street; _city = a.city;
        _lat = a.lat; _lng = a.lng;
        _isDefault = a.isDefault;
        _showAddrForm = true;
      });

  Future<void> _pickOnMap() async {
    final picked = await context.push<PickedLocation>('/location?pick=1');
    if (picked == null || !mounted) return;
    setState(() {
      _street = picked.street.isNotEmpty ? picked.street : picked.formatted;
      _city   = picked.city.isNotEmpty  ? picked.city   : 'Ghana';
      _lat    = picked.lat;
      _lng    = picked.lng;
    });
  }

  Future<void> _saveAddress() async {
    if (_street.isEmpty || _lat == 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please pick a location on the map')));
      return;
    }
    setState(() => _saving = true);
    try {
      if (_editingAddress != null) {
        await ref.read(usersApiProvider).updateAddress(_editingAddress!.id, label: _label, street: _street, city: _city, lat: _lat, lng: _lng, isDefault: _isDefault);
      } else {
        await ref.read(usersApiProvider).addAddress(label: _label, street: _street, city: _city, lat: _lat, lng: _lng, isDefault: _isDefault);
      }
      ref.invalidate(userProfileProvider);
      if (mounted) setState(() => _showAddrForm = false);
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
    final authUser    = ref.watch(authProvider).user;
    final profileAsync = ref.watch(userProfileProvider);

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            // ── Header ──
            SliverToBoxAdapter(
              child: _Header(authUser: authUser, profileAsync: profileAsync),
            ),

            // ── Body ──
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
              sliver: profileAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: Center(child: CircularProgressIndicator(color: GetGasColors.brand)),
                ),
                error: (_, __) => const SliverToBoxAdapter(
                  child: Center(child: Text('Could not load profile')),
                ),
                data: (profile) => SliverList(
                  delegate: SliverChildListDelegate([
                    // Address form
                    if (_showAddrForm) ...[
                      _AddressFormCard(
                        editing: _editingAddress,
                        label: _label,
                        street: _street,
                        lat: _lat,
                        isDefault: _isDefault,
                        saving: _saving,
                        labels: _labels,
                        onLabelChanged: (v) => setState(() => _label = v),
                        onPickMap: _pickOnMap,
                        onDefaultChanged: (v) => setState(() => _isDefault = v),
                        onCancel: () => setState(() => _showAddrForm = false),
                        onSave: _saveAddress,
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Saved addresses
                    _AddressesSection(
                      addresses: profile.savedAddresses,
                      showForm: _showAddrForm,
                      onAdd: () => _openAdd(profile.savedAddresses),
                      onEdit: _openEdit,
                      onDelete: _deleteAddress,
                      onSetDefault: _setDefault,
                    ),
                    const SizedBox(height: 20),

                    // ── Account section ──
                    _SectionLabel('Account'),
                    const SizedBox(height: 8),
                    _MenuCard(items: [
                      _MenuItem(icon: Icons.receipt_long_outlined, label: 'Order History',    onTap: () => context.go('/orders')),
                      _MenuItem(icon: Icons.schedule_outlined,      label: 'Scheduled Orders', onTap: () => context.push('/scheduled')),
                      _MenuItem(icon: Icons.star_outline,           label: 'Loyalty Points',   onTap: () => context.push('/loyalty')),
                    ]),
                    const SizedBox(height: 20),

                    // ── Support section ──
                    _SectionLabel('Support'),
                    const SizedBox(height: 8),
                    _MenuCard(items: [
                      _MenuItem(icon: Icons.help_outline,        label: 'Help & Support',  onTap: () => context.push('/help')),
                      _MenuItem(icon: Icons.description_outlined, label: 'Terms of Service', onTap: () => context.push('/terms')),
                      _MenuItem(icon: Icons.shield_outlined,      label: 'Privacy Policy',   onTap: () => context.push('/privacy')),
                    ]),
                    const SizedBox(height: 28),

                    // ── Sign out ──
                    Material(
                      color: GetGasColors.errorBg,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        onTap: () => setState(() => _showSignOut = true),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: GetGasColors.error.withValues(alpha: 0.25)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.logout_rounded, size: 18, color: GetGasColors.error),
                              SizedBox(width: 8),
                              Text('Sign Out', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: GetGasColors.error)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Center(
                      child: Text('GetGas v1.0.0', style: TextStyle(fontSize: 11, color: GetGasColors.textMuted)),
                    ),
                  ]),
                ),
              ),
            ),
          ],
        ),

        if (_showSignOut) _SignOutDialog(
          onCancel: () => setState(() => _showSignOut = false),
          onConfirm: () {
            ref.read(authProvider.notifier).logout();
            context.go('/login');
          },
        ),
      ],
    );
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  const _Header({required this.authUser, required this.profileAsync});

  final AuthUser? authUser;
  final AsyncValue<UserProfile> profileAsync;

  @override
  Widget build(BuildContext context) {
    final profile  = profileAsync.valueOrNull;
    final name     = profile?.name ?? authUser?.name ?? 'User';
    final phone    = profile?.phone ?? authUser?.phone ?? '';
    final initials = name.trim().split(' ').where((s) => s.isNotEmpty).map((s) => s[0]).take(2).join().toUpperCase();
    final showPhone = phone.isNotEmpty && !phone.startsWith('google_');

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: GetGasColors.bgCard,
        border: Border(bottom: BorderSide(color: GetGasColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('My Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: GetGasColors.text)),
              const SizedBox(height: 20),

              // Avatar row
              Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [GetGasColors.brand, GetGasColors.brandDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      initials.isEmpty ? 'U' : initials,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: GetGasColors.text)),
                        if (showPhone) ...[
                          const SizedBox(height: 3),
                          Text(phone, style: const TextStyle(fontSize: 13, color: GetGasColors.textMuted)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              // Stats row
              if (profile != null) ...[
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(child: _StatBox(value: '${profile.totalOrders}', label: 'Orders', color: GetGasColors.brand)),
                    const SizedBox(width: 12),
                    Expanded(child: _StatBox(value: '${profile.loyaltyPoints}', label: 'Points', color: const Color(0xFFF59E0B))),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.value, required this.label, required this.color});
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted)),
        ],
      ),
    );
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: GetGasColors.textMuted, letterSpacing: 0.8),
    );
  }
}

class _MenuItem {
  const _MenuItem({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

class _MenuCard extends StatelessWidget {
  const _MenuCard({required this.items});
  final List<_MenuItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: GetGasColors.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            _MenuTile(item: items[i]),
            if (i < items.length - 1)
              const Divider(height: 1, indent: 48, color: GetGasColors.border),
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.item});
  final _MenuItem item;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: GetGasColors.bgCard2,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(item.icon, size: 18, color: GetGasColors.textMuted),
              ),
              const SizedBox(width: 14),
              Expanded(child: Text(item.label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: GetGasColors.text))),
              const Icon(Icons.chevron_right, size: 18, color: GetGasColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Addresses ─────────────────────────────────────────────────────────────────

class _AddressesSection extends StatelessWidget {
  const _AddressesSection({
    required this.addresses,
    required this.showForm,
    required this.onAdd,
    required this.onEdit,
    required this.onDelete,
    required this.onSetDefault,
  });

  final List<SavedAddress> addresses;
  final bool showForm;
  final VoidCallback onAdd;
  final void Function(SavedAddress) onEdit;
  final void Function(String) onDelete;
  final void Function(String) onSetDefault;

  @override
  Widget build(BuildContext context) {
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
              const Expanded(
                child: Text('Saved Addresses', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              ),
              if (!showForm)
                GestureDetector(
                  onTap: onAdd,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: GetGasColors.brand.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, size: 14, color: GetGasColors.brand),
                        SizedBox(width: 4),
                        Text('Add', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: GetGasColors.brand)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          if (addresses.isEmpty && !showForm) ...[
            const SizedBox(height: 20),
            Center(
              child: Column(
                children: [
                  Icon(Icons.location_on_outlined, size: 36, color: GetGasColors.textMuted.withValues(alpha: 0.4)),
                  const SizedBox(height: 8),
                  const Text('No saved addresses yet', style: TextStyle(fontSize: 13, color: GetGasColors.textMuted)),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ] else
            ...addresses.map((a) => _AddressTile(
              address: a,
              onEdit: () => onEdit(a),
              onDelete: () => onDelete(a.id),
              onSetDefault: () => onSetDefault(a.id),
            )),
        ],
      ),
    );
  }
}

class _AddressTile extends StatelessWidget {
  const _AddressTile({required this.address, required this.onEdit, required this.onDelete, required this.onSetDefault});

  final SavedAddress address;
  final VoidCallback onEdit, onDelete, onSetDefault;

  @override
  Widget build(BuildContext context) {
    final l = address.label.toLowerCase();
    final icon = l.contains('home') ? Icons.home_outlined : l.contains('work') ? Icons.business_outlined : Icons.location_on_outlined;

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: GetGasColors.bgCard2,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GetGasColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(
              color: GetGasColors.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: GetGasColors.brand),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(address.label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    if (address.isDefault) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: GetGasColors.brand.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Default', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: GetGasColors.brand)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text('${address.street}, ${address.city}', style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          if (!address.isDefault)
            _IconBtn(icon: Icons.check_circle_outline, color: const Color(0xFF16A34A), onTap: onSetDefault),
          _IconBtn(icon: Icons.edit_outlined, color: GetGasColors.brand, onTap: onEdit),
          _IconBtn(icon: Icons.delete_outline, color: GetGasColors.error, onTap: onDelete),
        ],
      ),
    );
  }
}

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.color, required this.onTap});
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 18, color: color),
      ),
    );
  }
}

// ── Address form ──────────────────────────────────────────────────────────────

class _AddressFormCard extends StatelessWidget {
  const _AddressFormCard({
    required this.editing,
    required this.label,
    required this.street,
    required this.lat,
    required this.isDefault,
    required this.saving,
    required this.labels,
    required this.onLabelChanged,
    required this.onPickMap,
    required this.onDefaultChanged,
    required this.onCancel,
    required this.onSave,
  });

  final SavedAddress? editing;
  final String label, street;
  final double lat;
  final bool isDefault, saving;
  final List<String> labels;
  final void Function(String) onLabelChanged;
  final VoidCallback onPickMap;
  final void Function(bool) onDefaultChanged;
  final VoidCallback onCancel, onSave;

  @override
  Widget build(BuildContext context) {
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
              Expanded(child: Text(editing != null ? 'Edit Address' : 'New Address', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15))),
              GestureDetector(onTap: onCancel, child: const Icon(Icons.close, size: 20, color: GetGasColors.textMuted)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: labels.map((l) {
              final sel = label == l;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: l == labels.last ? 0 : 8),
                  child: OutlinedButton(
                    onPressed: () => onLabelChanged(l),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: sel ? GetGasColors.brand : GetGasColors.textMuted,
                      backgroundColor: sel ? GetGasColors.brand.withValues(alpha: 0.08) : null,
                      side: BorderSide(color: sel ? GetGasColors.brand : GetGasColors.border),
                      minimumSize: const Size(0, 40),
                    ),
                    child: Text(l, style: const TextStyle(fontSize: 12)),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Material(
            color: lat != 0 ? GetGasColors.brand.withValues(alpha: 0.06) : GetGasColors.bgCard2,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: onPickMap,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: lat != 0 ? GetGasColors.brand : GetGasColors.border),
                ),
                child: Row(
                  children: [
                    Icon(Icons.map_outlined, color: lat != 0 ? GetGasColors.brand : GetGasColors.textMuted),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        lat != 0 ? street : 'Pick location on map',
                        style: TextStyle(fontWeight: FontWeight.w600, color: lat != 0 ? GetGasColors.text : GetGasColors.textMuted),
                      ),
                    ),
                    Icon(Icons.chevron_right, size: 18, color: lat != 0 ? GetGasColors.brand : GetGasColors.textMuted),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          CheckboxListTile(
            value: isDefault,
            onChanged: (v) => onDefaultChanged(v ?? false),
            title: const Text('Set as default address', style: TextStyle(fontSize: 13)),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            activeColor: GetGasColors.brand,
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: onCancel, style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)), child: const Text('Cancel'))),
              const SizedBox(width: 8),
              Expanded(child: PrimaryButton(label: editing != null ? 'Update' : 'Save', loading: saving, onPressed: saving ? null : onSave)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Sign out dialog ───────────────────────────────────────────────────────────

class _SignOutDialog extends StatelessWidget {
  const _SignOutDialog({required this.onCancel, required this.onConfirm});
  final VoidCallback onCancel, onConfirm;

  @override
  Widget build(BuildContext context) {
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
              border: Border.all(color: GetGasColors.border),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: GetGasColors.errorBg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.logout_rounded, color: GetGasColors.error, size: 26),
                ),
                const SizedBox(height: 16),
                const Text('Sign out?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(height: 6),
                const Text(
                  'You will need to sign in again to place orders.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: GetGasColors.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(child: OutlinedButton(onPressed: onCancel, style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)), child: const Text('Cancel'))),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: onConfirm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: GetGasColors.error,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(0, 46),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
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
