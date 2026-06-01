import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthScreen, FieldLabel, AuthInput, PrimaryButton, LinkButton,
  PhonePrefixInput, OtpInput, DevOtpHint, ErrorText,
} from '@getgas/mobile-ui';
import { useOtpCountdown } from '@getgas/mobile-ui';
import { normalizeGhanaPhone, validateGhanaPhoneLocal } from '@getgas/domain';
import { authApi, parseUserLogin } from '@getgas/mobile-core';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { seconds, canResend, start } = useOtpCountdown(90);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp() {
    if (!validateGhanaPhoneLocal(phone)) {
      setError('Enter a valid 9-digit Ghana number');
      return;
    }
    setError('');
    setLoading(true);
    const normalized = normalizeGhanaPhone(phone);
    try {
      const res = await authApi.sendOTP(normalized, 'forgot_password');
      setE164(normalized);
      setDevCode(res.data._devCode);
      setStep('otp');
      start();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (otp.length < 4) { setError('Enter the OTP'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(e164, otp, password);
      const res = await authApi.login(e164, password);
      const { token, user } = parseUserLogin(res.data);
      await login(token, user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Reset password"
      subtitle="We'll send an OTP to verify your number"
      footer={<LinkButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />}
    >
      {step === 'phone' && (
        <>
          <FieldLabel>Phone number</FieldLabel>
          <PhonePrefixInput value={phone} onChangeText={setPhone} error={error} />
          <PrimaryButton label="Send OTP" onPress={sendOtp} loading={loading} />
        </>
      )}

      {step === 'otp' && (
        <>
          <FieldLabel>OTP</FieldLabel>
          <OtpInput value={otp} onChange={setOtp} />
          <DevOtpHint code={devCode} />
          {!canResend ? (
            <Text style={styles.countdown}>Resend in {seconds}s</Text>
          ) : (
            <LinkButton label="Resend OTP" onPress={sendOtp} />
          )}
          <PrimaryButton label="Continue" onPress={() => { setError(''); setStep('password'); }} />
        </>
      )}

      {step === 'password' && (
        <>
          <FieldLabel>New password</FieldLabel>
          <AuthInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Min. 6 characters" />
          <FieldLabel>Confirm password</FieldLabel>
          <AuthInput secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="Repeat password" />
          <ErrorText message={error} />
          <PrimaryButton label="Save & sign in" onPress={resetPassword} loading={loading} />
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  countdown: { textAlign: 'center', color: '#6B7280', marginTop: 12, fontSize: 13 },
});
