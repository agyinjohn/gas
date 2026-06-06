import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

enum _ForgotStep { phone, otp, password }

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  _ForgotStep _step = _ForgotStep.phone;

  final _phone    = TextEditingController();
  final _password = TextEditingController();
  final _confirm  = TextEditingController();

  String _e164 = '';
  String _otp  = '';
  bool _loading   = false;
  bool _resending = false;

  String? _phoneError, _otpError, _passwordError, _confirmError, _generalError;

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
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _countdown.start();
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _countdown.tick();
      if (_countdown.canResend) { _timer?.cancel(); }
    });
  }

  void _clearErrors() => setState(() {
    _phoneError = _otpError = _passwordError = _confirmError = _generalError = null;
  });

  Future<void> _sendOtp() async {
    if (!validateGhanaPhoneLocal(_phone.text)) {
      setState(() => _phoneError = 'Enter a valid Ghana phone number');
      return;
    }
    setState(() { _loading = true; _phoneError = null; });
    try {
      _e164 = normalizeGhanaPhone(_phone.text);
      await ref.read(authRepositoryProvider).sendOtp(_phone.text, 'forgot_password');
      setState(() => _step = _ForgotStep.otp);
      _startCountdown();
    } on ApiException catch (e) {
      setState(() => _phoneError = e.message);
    } catch (_) {
      setState(() => _phoneError = 'Could not send OTP. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    setState(() => _resending = true);
    try {
      await ref.read(authRepositoryProvider).sendOtp(_phone.text, 'forgot_password');
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
    if (_otp.length < 4) { setState(() => _otpError = 'Enter the 4-digit code'); return; }
    setState(() { _otpError = null; _step = _ForgotStep.password; });
  }

  Future<void> _resetPassword() async {
    final errs = <String, String>{};
    if (_password.text.length < 6) errs['password'] = 'Password must be at least 6 characters';
    if (_password.text != _confirm.text) errs['confirm'] = 'Passwords do not match';
    if (errs.isNotEmpty) {
      setState(() { _passwordError = errs['password']; _confirmError = errs['confirm']; });
      return;
    }
    setState(() { _loading = true; _generalError = null; });
    try {
      await ref.read(authProvider.notifier).resetPassword(
        phoneE164: _e164,
        otp: _otp,
        newPassword: _password.text,
      );
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      final msg = e.message.toLowerCase();
      if (msg.contains('otp') || msg.contains('expired')) {
        setState(() { _step = _ForgotStep.otp; _otp = ''; _otpError = 'Code expired. Request a new one.'; });
      } else {
        setState(() => _generalError = e.message);
      }
    } catch (_) {
      setState(() => _generalError = 'Failed to reset password');
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
                _ForgotStep.phone    => _phoneSections(),
                _ForgotStep.otp      => _otpSections(),
                _ForgotStep.password => _passwordSections(),
              },
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _phoneSections() => [
    const AuthStepHeader(
      title: 'Forgot password?',
      subtitle: "Enter your phone number and we'll send a verification code",
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
        PrimaryButton(label: 'Send Code', loading: _loading, showArrow: true, onPressed: _sendOtp),
      ],
    ),
    Center(
      child: AuthBackLink(
        label: 'Back to sign in',
        onTap: () => context.go('/login'),
      ),
    ),
  ];

  List<Widget> _otpSections() => [
    AuthStepHeader(
      title: 'Check your phone',
      centered: true,
      subtitleWidget: Text.rich(
        TextSpan(
          text: 'Enter the 4-digit code sent to\n',
          style: const TextStyle(fontSize: 14, color: GetGasColors.textMuted),
          children: [
            TextSpan(
              text: _e164,
              style: const TextStyle(fontWeight: FontWeight.w600, color: GetGasColors.text),
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
          onChanged: (v) => setState(() { _otp = v; _otpError = null; }),
        ),
        if (_otpError != null) ...[
          const SizedBox(height: 8),
          Text(_otpError!, textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: GetGasColors.error)),
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
          label: 'Continue', showArrow: true,
          onPressed: _otp.length >= 4 ? _verifyOtp : null,
        ),
        Center(
          child: AuthBackLink(
            label: 'Change number',
            onTap: () => setState(() { _step = _ForgotStep.phone; _otp = ''; _clearErrors(); }),
          ),
        ),
      ],
    ),
  ];

  List<Widget> _passwordSections() => [
    const AuthStepHeader(
      title: 'Set new password',
      subtitle: 'Choose a strong password for your account',
    ),
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ErrorBanner(message: _generalError),
        const FieldLabel('New password'),
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
        PrimaryButton(
          label: 'Reset Password & Sign In',
          loading: _loading,
          showArrow: true,
          onPressed: _resetPassword,
        ),
      ],
    ),
  ];
}
