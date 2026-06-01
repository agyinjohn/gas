import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

enum _ForgotStep { phone, otp, password }

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.prefillPhone});

  /// E.164 phone from login PASSWORD_REQUIRED redirect.
  final String? prefillPhone;

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  late _ForgotStep _step;
  late final TextEditingController _phone;
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  String _e164 = '';
  String _otp = '';
  bool _loading = false;
  bool _sending = false;
  bool _resending = false;
  bool _autoSent = false;

  String? _phoneError;
  String? _otpError;
  String? _passwordError;
  String? _confirmError;
  String? _generalError;

  late final OtpCountdownController _countdown;
  Timer? _timer;

  bool get _isFirstTime => widget.prefillPhone != null && widget.prefillPhone!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _countdown = OtpCountdownController(onTick: () {
      if (mounted) setState(() {});
    });

    if (_isFirstTime) {
      _e164 = widget.prefillPhone!;
      _phone = TextEditingController(text: _e164.replaceFirst('+233', ''));
      _step = _ForgotStep.otp;
      WidgetsBinding.instance.addPostFrameCallback((_) => _autoSendOtp());
    } else {
      _phone = TextEditingController();
      _step = _ForgotStep.phone;
    }
  }

  Future<void> _autoSendOtp() async {
    if (_autoSent) return;
    _autoSent = true;
    try {
      await ref.read(authRepositoryProvider).sendOtp(_phone.text, 'forgot_password');
      _startCountdown();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verification code sent to your phone')),
        );
      }
    } catch (_) {
      if (mounted) setState(() => _step = _ForgotStep.phone);
    }
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
      if (_countdown.canResend) _timer?.cancel();
    });
  }

  void _clearErrors() {
    setState(() {
      _phoneError = null;
      _otpError = null;
      _passwordError = null;
      _confirmError = null;
      _generalError = null;
    });
  }

  Future<void> _sendOtp() async {
    if (!validateGhanaPhoneLocal(_phone.text)) {
      setState(() => _phoneError = 'Enter a valid 9-digit Ghana number');
      return;
    }
    _clearErrors();
    setState(() => _sending = true);
    try {
      _e164 = normalizeGhanaPhone(_phone.text);
      await ref.read(authRepositoryProvider).sendOtp(_phone.text, 'forgot_password');
      setState(() => _step = _ForgotStep.otp);
      _startCountdown();
    } on ApiException catch (e) {
      setState(() => _phoneError = e.message);
    } catch (_) {
      setState(() => _phoneError = 'Could not send OTP');
    } finally {
      if (mounted) setState(() => _sending = false);
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
    if (_otp.length < 4) {
      setState(() => _otpError = 'Enter the 4-digit code');
      return;
    }
    _clearErrors();
    setState(() => _step = _ForgotStep.password);
  }

  Future<void> _resetPassword() async {
    final errs = <String, String>{};
    if (_password.text.length < 6) errs['password'] = 'Password must be at least 6 characters';
    if (_password.text != _confirm.text) errs['confirm'] = 'Passwords do not match';
    if (errs.isNotEmpty) {
      setState(() {
        _passwordError = errs['password'];
        _confirmError = errs['confirm'];
      });
      return;
    }
    _clearErrors();
    setState(() => _loading = true);
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
        setState(() {
          _step = _ForgotStep.otp;
          _otp = '';
          _otpError = 'Code expired or invalid. Request a new one.';
        });
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
                _ForgotStep.phone => _phoneStep(),
                _ForgotStep.otp => _otpStep(),
                _ForgotStep.password => _passwordStep(),
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
          PrimaryButton(
            label: 'Send Code',
            loading: _sending,
            showArrow: true,
            onPressed: _sendOtp,
          ),
        ],
      ),
      Center(
        child: AuthBackLink(
          label: 'Back to sign in',
          onTap: () => context.go('/login'),
        ),
      ),
    ];
  }

  List<Widget> _otpStep() {
    return [
      AuthStepHeader(
        title: _isFirstTime ? 'Verify your number' : 'Check your phone',
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
          if (!_isFirstTime)
            Center(
              child: AuthBackLink(
                label: 'Change number',
                onTap: () {
                  setState(() {
                    _step = _ForgotStep.phone;
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

  List<Widget> _passwordStep() {
    return [
      AuthStepHeader(
        title: _isFirstTime ? 'Create your password' : 'Set new password',
        subtitle: _isFirstTime
            ? 'Create a password to secure your account'
            : 'Choose a strong password for your account',
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ErrorBanner(message: _generalError),
          FieldLabel(_isFirstTime ? 'Password' : 'New password'),
          PasswordField(
            controller: _password,
            errorText: _passwordError,
            hintText: 'Min. 6 characters',
            onChanged: (_) => _clearErrors(),
          ),
          const FieldLabel('Confirm password'),
          AuthTextField(
            controller: _confirm,
            placeholder: 'Repeat your password',
            obscureText: true,
            errorText: _confirmError,
            onChanged: (_) => _clearErrors(),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: _isFirstTime ? 'Create Password & Sign In' : 'Reset Password & Sign In',
            loading: _loading,
            showArrow: true,
            onPressed: _resetPassword,
          ),
        ],
      ),
    ];
  }
}
