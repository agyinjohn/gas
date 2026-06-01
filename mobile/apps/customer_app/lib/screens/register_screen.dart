import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

enum _RegisterStep { phone, otp, details }

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  _RegisterStep _step = _RegisterStep.phone;
  final _phone = TextEditingController();
  final _name = TextEditingController();
  final _password = TextEditingController();

  String _e164 = '';
  String _otp = '';
  bool _loading = false;
  bool _resending = false;

  String? _phoneError;
  String? _otpError;
  String? _nameError;
  String? _passwordError;
  String? _generalError;

  late final OtpCountdownController _countdown;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _countdown = OtpCountdownController(onTick: () {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _phone.dispose();
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _countdown.start();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _countdown.tick();
      if (_countdown.canResend) _timer?.cancel();
    });
  }

  void _clearErrors() {
    setState(() {
      _phoneError = null;
      _otpError = null;
      _nameError = null;
      _passwordError = null;
      _generalError = null;
    });
  }

  Future<void> _sendOtp() async {
    if (!validateGhanaPhoneLocal(_phone.text)) {
      setState(() => _phoneError = 'Enter a valid 9-digit Ghana number');
      return;
    }
    _clearErrors();
    setState(() => _loading = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      _e164 = normalizeGhanaPhone(_phone.text);
      await repo.sendOtp(_phone.text, 'registration');
      setState(() => _step = _RegisterStep.otp);
      _startCountdown();
    } on ApiException catch (e) {
      if (e.statusCode == 409) {
        setState(() => _phoneError = 'This number is already registered. Sign in instead.');
      } else {
        setState(() => _phoneError = e.message);
      }
    } catch (_) {
      setState(() => _phoneError = 'Could not send OTP');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    setState(() => _resending = true);
    try {
      await ref.read(authRepositoryProvider).sendOtp(_phone.text, 'registration');
      setState(() => _otp = '');
      _startCountdown();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not resend. Try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  void _verifyOtp() {
    if (_otp.length < 4) {
      setState(() => _otpError = 'Enter the 4-digit code');
      return;
    }
    _clearErrors();
    setState(() => _step = _RegisterStep.details);
  }

  Future<void> _register() async {
    final errs = <String, String>{};
    if (_name.text.trim().length < 2) errs['name'] = 'Enter your full name';
    if (_password.text.length < 6) errs['password'] = 'Password must be at least 6 characters';
    if (errs.isNotEmpty) {
      setState(() {
        _nameError = errs['name'];
        _passwordError = errs['password'];
      });
      return;
    }
    _clearErrors();
    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).register(
            phoneE164: _e164,
            otp: _otp,
            name: _name.text.trim(),
            password: _password.text,
          );
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      final msg = e.message.toLowerCase();
      if (msg.contains('otp')) {
        setState(() {
          _step = _RegisterStep.otp;
          _otp = '';
          _otpError = 'OTP expired or invalid. Please request a new one.';
        });
      } else {
        setState(() => _generalError = e.message);
      }
    } catch (_) {
      setState(() => _generalError = 'Registration failed');
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
                _RegisterStep.phone => _phoneStep(),
                _RegisterStep.otp => _otpStep(),
                _RegisterStep.details => _detailsStep(),
              },
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _phoneStep() {
    return [
      const AuthStepHeader(
        title: 'Create account',
        subtitle: 'Enter your phone number to get started',
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const FieldLabel('Phone number'),
          PhonePrefixField(
            controller: _phone,
            errorText: _phoneError,
            onChanged: (_) => _clearErrors(),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Send OTP',
            loading: _loading,
            showArrow: true,
            onPressed: _sendOtp,
          ),
        ],
      ),
      AuthFooterLine(
        prefix: 'Already have an account? ',
        linkText: 'Sign in',
        onLinkTap: () => context.go('/login'),
      ),
    ];
  }

  List<Widget> _otpStep() {
    return [
      AuthStepHeader(
        title: 'Verify your number',
        centered: true,
        subtitleWidget: Text.rich(
          TextSpan(
            text: 'Enter the 4-digit code sent to\n',
            style: const TextStyle(fontSize: 14, color: GetGasColors.textMuted),
            children: [
              TextSpan(
                text: _e164,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: GetGasColors.text,
                ),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OtpBoxes(
            value: _otp,
            hasError: _otpError != null,
            onChanged: (v) {
              setState(() {
                _otp = v;
                _otpError = null;
              });
            },
          ),
          if (_otpError != null) ...[
            const SizedBox(height: 8),
            Text(
              _otpError!,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: GetGasColors.error),
            ),
          ],
          const SizedBox(height: 20),
          OtpResendRow(
            canResend: _countdown.canResend,
            timeString: _countdown.timeString,
            resending: _resending,
            onResend: _resendOtp,
          ),
          const SizedBox(height: 20),
          PrimaryButton(
            label: 'Continue',
            showArrow: true,
            onPressed: _otp.length >= 4 ? _verifyOtp : null,
          ),
          Center(
            child: AuthBackLink(
              label: 'Change number',
              onTap: () {
                setState(() {
                  _step = _RegisterStep.phone;
                  _otp = '';
                  _clearErrors();
                });
              },
            ),
          ),
        ],
      ),
    ];
  }

  List<Widget> _detailsStep() {
    return [
      const AuthStepHeader(
        title: 'Almost there!',
        subtitle: 'Set your name and a password',
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ErrorBanner(message: _generalError),
          const FieldLabel('Full name'),
          AuthTextField(
            controller: _name,
            placeholder: 'e.g. Kwame Mensah',
            errorText: _nameError,
            onChanged: (_) => _clearErrors(),
          ),
          const FieldLabel('Password'),
          PasswordField(
            controller: _password,
            errorText: _passwordError,
            onChanged: (_) => _clearErrors(),
            hintText: 'Min. 6 characters',
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Create Account',
            loading: _loading,
            showCheck: true,
            onPressed: _register,
          ),
        ],
      ),
    ];
  }
}
