import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

enum _Step { personal, vehicle, success }

const _vehicleTypes = [
  (value: 'motorbike', label: 'Motorbike', icon: Icons.two_wheeler_rounded),
  (value: 'tricycle',  label: 'Tricycle',  icon: Icons.electric_rickshaw_rounded),
  (value: 'van',       label: 'Van',       icon: Icons.airport_shuttle_rounded),
];

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  _Step _step = _Step.personal;

  final _name       = TextEditingController();
  final _phone      = TextEditingController();
  final _nationalId = TextEditingController();
  final _password   = TextEditingController();
  final _confirm    = TextEditingController();
  final _plate      = TextEditingController();

  String _vehicleType = 'motorbike';
  bool _loading = false;
  String? _nameError, _phoneError, _idError, _passwordError, _confirmError, _plateError, _generalError;

  // saved from step 1
  String _savedName = '', _savedPhone = '', _savedNationalId = '', _savedPassword = '';

  @override
  void dispose() {
    _name.dispose(); _phone.dispose(); _nationalId.dispose();
    _password.dispose(); _confirm.dispose(); _plate.dispose();
    super.dispose();
  }

  void _clearErrors() => setState(() {
    _nameError = _phoneError = _idError = _passwordError = _confirmError = _plateError = _generalError = null;
  });

  void _nextStep() {
    final errs = <String, String>{};
    if (_name.text.trim().length < 2) errs['name'] = 'Enter your full name';
    if (!validateGhanaPhoneLocal(_phone.text)) errs['phone'] = 'Enter a valid Ghana phone number';
    if (!RegExp(r'^GHA-\d{9}-\d$').hasMatch(_nationalId.text.trim().toUpperCase())) {
      errs['id'] = 'Format must be GHA-NNNNNNNNN-N';
    }
    if (_password.text.length < 6) errs['password'] = 'Password must be at least 6 characters';
    if (_password.text != _confirm.text) errs['confirm'] = 'Passwords do not match';
    if (errs.isNotEmpty) {
      setState(() {
        _nameError = errs['name']; _phoneError = errs['phone']; _idError = errs['id'];
        _passwordError = errs['password']; _confirmError = errs['confirm'];
      });
      return;
    }
    setState(() {
      _savedName       = _name.text.trim();
      _savedPhone      = normalizeGhanaPhone(_phone.text);
      _savedNationalId = _nationalId.text.trim().toUpperCase();
      _savedPassword   = _password.text;
      _step = _Step.vehicle;
    });
  }

  Future<void> _submit() async {
    if (_plate.text.trim().isEmpty) {
      setState(() => _plateError = 'Enter your vehicle plate number');
      return;
    }
    setState(() { _loading = true; _generalError = null; });
    try {
      await ref.read(authRepositoryProvider).authApi.riderRegister(
        name: _savedName,
        phone: _savedPhone,
        password: _savedPassword,
        nationalId: _savedNationalId,
        vehicleType: _vehicleType,
        vehiclePlate: _plate.text.trim().toUpperCase(),
      );
      setState(() => _step = _Step.success);
    } on ApiException catch (e) {
      setState(() => _generalError = e.message);
    } catch (_) {
      setState(() => _generalError = 'Registration failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: AuthFlowLayout(
              sections: switch (_step) {
                _Step.personal => _personalSections(),
                _Step.vehicle  => _vehicleSections(),
                _Step.success  => _successSections(),
              },
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _personalSections() => [
    const AuthStepHeader(
      title: 'Become a rider',
      subtitle: 'Start with your personal details',
    ),
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ErrorBanner(message: _generalError),
        const FieldLabel('Full name'),
        AuthTextField(
          controller: _name,
          placeholder: 'As on your national ID',
          errorText: _nameError,
          onChanged: (_) => _clearErrors(),
        ),
        const FieldLabel('Phone number'),
        PhonePrefixField(
          controller: _phone,
          errorText: _phoneError,
          onChanged: (_) => _clearErrors(),
        ),
        const FieldLabel('National ID'),
        AuthTextField(
          controller: _nationalId,
          placeholder: 'GHA-000000000-0',
          errorText: _idError,
          onChanged: (_) => _clearErrors(),
        ),
        const FieldLabel('Password'),
        PasswordField(
          controller: _password,
          errorText: _passwordError,
          hintText: 'Min. 6 characters',
          onChanged: (_) => _clearErrors(),
        ),
        const FieldLabel('Confirm password'),
        PasswordField(
          controller: _confirm,
          errorText: _confirmError,
          hintText: 'Repeat your password',
          onChanged: (_) => _clearErrors(),
        ),
        const SizedBox(height: 16),
        PrimaryButton(label: 'Continue', showArrow: true, onPressed: _nextStep),
      ],
    ),
    AuthFooterLine(
      prefix: 'Already registered? ',
      linkText: 'Sign in',
      onLinkTap: () => context.go('/login'),
    ),
  ];

  List<Widget> _vehicleSections() => [
    AuthStepHeader(
      title: 'Vehicle details',
      subtitle: 'Tell us about your vehicle',
      // back button
      subtitleWidget: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tell us about your vehicle',
              style: TextStyle(fontSize: 14, color: GetGasColors.textMuted)),
          const SizedBox(height: 8),
          AuthBackLink(
            label: 'Back to personal details',
            onTap: () => setState(() { _step = _Step.personal; _clearErrors(); }),
          ),
        ],
      ),
    ),
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ErrorBanner(message: _generalError),
        const FieldLabel('Vehicle type'),
        const SizedBox(height: 8),
        Row(
          children: _vehicleTypes.map((t) {
            final active = t.value == _vehicleType;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _vehicleType = t.value),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: active
                        ? GetGasColors.brand.withValues(alpha: 0.08)
                        : GetGasColors.bgCard2,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: active ? GetGasColors.brand : GetGasColors.border,
                      width: active ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(t.icon, size: 26,
                          color: active ? GetGasColors.brand : GetGasColors.textMuted),
                      const SizedBox(height: 6),
                      Text(t.label,
                          style: TextStyle(
                            fontSize: 11, fontWeight: FontWeight.w700,
                            color: active ? GetGasColors.brand : GetGasColors.textMuted,
                          )),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const FieldLabel('Plate number'),
        AuthTextField(
          controller: _plate,
          placeholder: 'GR-1234-23',
          errorText: _plateError,
          onChanged: (_) => _clearErrors(),
        ),
        const SizedBox(height: 16),
        PrimaryButton(
          label: 'Submit Application',
          loading: _loading,
          onPressed: _loading ? null : _submit,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: const Text(
            'Our team will review your details and send you an SMS once approved — usually within 24 hours.',
            style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8), height: 1.5),
          ),
        ),
      ],
    ),
  ];

  List<Widget> _successSections() => [
    const AuthStepHeader(
      title: 'Application submitted!',
      centered: true,
      subtitle: 'Our team will review your details and send you an SMS once your account is approved.',
    ),
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Center(
          child: Icon(Icons.check_circle_outline_rounded,
              size: 64, color: Color(0xFF16A34A)),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            _InfoTile(icon: Icons.assignment_outlined,   label: 'KYC Review',    sub: '~24 hrs'),
            const SizedBox(width: 8),
            _InfoTile(icon: Icons.sms_outlined,          label: 'SMS Alert',     sub: 'On approval'),
            const SizedBox(width: 8),
            _InfoTile(icon: Icons.rocket_launch_outlined, label: 'Start Earning', sub: 'Right away'),
          ],
        ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Back to Sign In', onPressed: () => context.go('/login')),
      ],
    ),
  ];
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.icon, required this.label, required this.sub});
  final IconData icon;
  final String label, sub;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: GetGasColors.bgCard2,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: GetGasColors.brand),
            const SizedBox(height: 6),
            Text(label,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center),
            Text(sub,
                style: const TextStyle(fontSize: 10, color: GetGasColors.textMuted),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
