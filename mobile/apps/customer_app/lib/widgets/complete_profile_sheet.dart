import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';

import '../providers/api_providers.dart';
import '../providers/auth_provider.dart';
import '../utils/profile_helpers.dart';

/// Blocking sheet for Google users missing name/phone — mirrors web CompleteProfileModal.
class CompleteProfileSheet extends ConsumerStatefulWidget {
  const CompleteProfileSheet({super.key});

  @override
  ConsumerState<CompleteProfileSheet> createState() => _CompleteProfileSheetState();
}

class _CompleteProfileSheetState extends ConsumerState<CompleteProfileSheet> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthUser user) async {
    final missingName = userMissingName(user);
    final missingPhone = userMissingPhone(user);

    if (missingName && _nameController.text.trim().isEmpty) {
      setState(() => _error = 'Enter your name');
      return;
    }
    if (missingPhone) {
      final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
      if (digits.length < 9) {
        setState(() => _error = 'Enter a valid phone number');
        return;
      }
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (missingName) {
        final profile = await ref.read(usersApiProvider).updateMe(name: _nameController.text.trim());
        await ref.read(authRepositoryProvider).updateStoredUser(
              AuthUser(id: profile.id, name: profile.name, phone: user.phone, role: UserRole.user),
            );
        ref.read(authProvider.notifier).refreshUser(
              AuthUser(id: profile.id, name: profile.name, phone: user.phone, role: UserRole.user),
            );
      }

      if (missingPhone) {
        final result = await ref.read(authRepositoryProvider).addPhone(_phoneController.text);
        ref.read(authProvider.notifier).refreshUser(result.user);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated!')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    if (user == null || !userNeedsProfileCompletion(user)) return const SizedBox.shrink();

    final missingName = userMissingName(user);
    final missingPhone = userMissingPhone(user);

    return Material(
      color: Colors.black54,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: GetGasColors.bgCard,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: GetGasColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Complete your profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(
                  missingName && missingPhone
                      ? 'We need your name and phone number to continue'
                      : missingName
                          ? 'What should we call you?'
                          : 'Add your phone number to place orders',
                  style: const TextStyle(fontSize: 12, color: GetGasColors.textMuted),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: GetGasColors.error, fontSize: 12)),
                ],
                if (missingName) ...[
                  const SizedBox(height: 16),
                  const FieldLabel('Full name'),
                  AuthTextField(
                    controller: _nameController,
                    placeholder: 'e.g. Kwame Mensah',
                  ),
                ],
                if (missingPhone) ...[
                  const SizedBox(height: 16),
                  const FieldLabel('Phone number'),
                  PhonePrefixField(controller: _phoneController),
                ],
                const SizedBox(height: 20),
                PrimaryButton(
                  label: 'Save & Continue',
                  loading: _loading,
                  onPressed: _loading ? null : () => _submit(user),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
