import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone    = TextEditingController();
  final _password = TextEditingController();

  String? _phoneError;
  String? _passwordError;
  String? _generalError;
  bool _loading = false;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  void _clearErrors() => setState(() {
    _phoneError = _passwordError = _generalError = null;
  });

  Future<void> _submit() async {
    if (!validateGhanaPhoneLocal(_phone.text)) {
      setState(() => _phoneError = 'Enter a valid Ghana phone number');
      return;
    }
    if (_password.text.isEmpty) {
      setState(() => _passwordError = 'Enter your password');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).login(_phone.text, _password.text);
    } on ApiException catch (e) {
      setState(() => _generalError = e.message);
    } catch (_) {
      setState(() => _generalError = 'Login failed. Please try again.');
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
            child: AuthScreen(
              showBrandLogo: true,
              title: 'Welcome back',
              subtitle: 'Sign in to your rider account',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ErrorBanner(message: _generalError),
                  const FieldLabel('Phone number'),
                  PhonePrefixField(
                    controller: _phone,
                    errorText: _phoneError,
                    onChanged: (_) => _clearErrors(),
                  ),
                  const FieldLabel('Password'),
                  PasswordField(
                    controller: _password,
                    errorText: _passwordError,
                    onChanged: (_) => _clearErrors(),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => context.push('/forgot-password'),
                      child: const Text(
                        'Forgot password?',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: GetGasColors.brand,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  PrimaryButton(
                    label: 'Sign In',
                    loading: _loading,
                    showArrow: true,
                    onPressed: _submit,
                  ),
                  const AuthSectionSpacer(),
                  AuthFooterLine(
                    prefix: 'New rider? ',
                    linkText: 'Apply now',
                    onLinkTap: () => context.push('/register'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
