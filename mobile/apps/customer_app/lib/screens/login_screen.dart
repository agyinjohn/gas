import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:getgas_core/getgas_core.dart';
import 'package:getgas_ui/getgas_ui.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/auth_provider.dart';
import '../services/google_auth_service.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController();
  final _password = TextEditingController();

  String? _phoneError;
  String? _passwordError;
  String? _generalError;
  bool _loading = false;
  bool _googleLoading = false;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final errors = validateLoginForm(_phone.text, _password.text);
    setState(() {
      _phoneError = errors['phone'];
      _passwordError = errors['password'];
      _generalError = null;
    });
    if (errors.isNotEmpty) return;

    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).login(_phone.text, _password.text);
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      if (e.code == 'PASSWORD_REQUIRED' && mounted) {
        final e164 = normalizeGhanaPhone(_phone.text);
        context.push('/forgot-password?phone=${Uri.encodeComponent(e164)}');
        return;
      }
      setState(() => _generalError = e.message);
    } catch (_) {
      setState(() => _generalError = 'Login failed. Please try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _googleSignIn() async {
    setState(() => _googleLoading = true);
    try {
      final config = ref.read(appConfigProvider);
      final result = await GoogleAuthService(config).signIn();
      if (result == null) return;

      await ref.read(authProvider.notifier).signInWithGoogleResult(
            token: result.token,
            userId: result.userId,
            name: result.name,
            needsProfile: result.needsProfile,
          );
      if (mounted) context.go('/');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Google sign-in failed. Try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  Future<void> _openRiderApply() async {
    final webUrl = ref.read(appConfigProvider).webBaseUrl;
    final uri = Uri.parse('$webUrl/rider/register');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _clearFieldErrors() {
    setState(() {
      _phoneError = null;
      _passwordError = null;
      _generalError = null;
    });
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
              subtitle: 'Sign in to your account',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ErrorBanner(message: _generalError),
                  const FieldLabel('Phone number'),
                  PhonePrefixField(
                    controller: _phone,
                    errorText: _phoneError,
                    onChanged: (_) => _clearFieldErrors(),
                  ),
                  const FieldLabel('Password'),
                  PasswordField(
                    controller: _password,
                    errorText: _passwordError,
                    onChanged: (_) => _clearFieldErrors(),
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
                  const AuthDivider(),
                  GoogleOutlineButton(
                    loading: _googleLoading,
                    onPressed: _googleSignIn,
                  ),
                  const AuthSectionSpacer(),
                  AuthFooterLine(
                    prefix: "Don't have an account? ",
                    linkText: 'Create one',
                    onLinkTap: () => context.push('/register'),
                  ),
                  const SizedBox(height: 8),
                  AuthFooterLine(
                    prefix: 'Want to deliver with us? ',
                    linkText: 'Apply as a rider',
                    onLinkTap: _openRiderApply,
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
