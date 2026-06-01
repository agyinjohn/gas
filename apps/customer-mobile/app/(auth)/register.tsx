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

type Step = 'phone' | 'otp' | 'details';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { seconds, canResend, start } = useOtpCountdown(90);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [e164, setE164] = useState('');
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await authApi.sendOTP(normalized, 'registration');
      setE164(normalized);
      setDevCode(res.data._devCode);
      setStep('otp');
      start();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 409) setError('This number is already registered. Sign in instead.');
      else setError(msg ?? 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister() {
    if (otp.length < 4) { setError('Enter the 4-digit OTP'); return; }
    if (!name.trim()) { setError('Enter your name'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.register({ phone: e164, otp, name: name.trim(), password });
      const { token, user } = parseUserLogin(res.data);
      await login(token, user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Create account"
      subtitle={step === 'phone' ? 'Step 1 of 3 — verify your phone' : step === 'otp' ? 'Step 2 of 3 — enter OTP' : 'Step 3 of 3 — your details'}
      footer={<LinkButton label="Already have an account? Sign in" onPress={() => router.replace('/(auth)/login')} />}
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
          <Text style={styles.hint}>Code sent to {e164}</Text>
          <FieldLabel>OTP</FieldLabel>
          <OtpInput value={otp} onChange={setOtp} error={error} />
          <DevOtpHint code={devCode} />
          {!canResend ? (
            <Text style={styles.countdown}>Resend in {seconds}s</Text>
          ) : (
            <LinkButton label="Resend OTP" onPress={sendOtp} />
          )}
          <PrimaryButton label="Continue" onPress={() => { setError(''); setStep('details'); }} />
        </>
      )}

      {step === 'details' && (
        <>
          <FieldLabel>Full name</FieldLabel>
          <AuthInput placeholder="Your name" value={name} onChangeText={setName} />
          <FieldLabel>Password</FieldLabel>
          <AuthInput placeholder="Min. 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
          <ErrorText message={error} />
          <PrimaryButton label="Create account" onPress={submitRegister} loading={loading} />
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  countdown: { textAlign: 'center', color: '#6B7280', marginTop: 12, fontSize: 13 },
});
