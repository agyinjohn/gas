import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthScreen, FieldLabel, AuthInput, PrimaryButton, LinkButton,
  PhonePrefixInput, ErrorText,
} from '@getgas/mobile-ui';
import { normalizeGhanaPhone, validateGhanaPhoneLocal } from '@getgas/domain';
import { authApi } from '@getgas/mobile-core';

type Step = 'personal' | 'vehicle' | 'success';

const VEHICLE_TYPES = [
  { id: 'motorbike', label: 'Motorbike' },
  { id: 'tricycle', label: 'Tricycle' },
  { id: 'van', label: 'Van' },
] as const;

export default function RiderRegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<'motorbike' | 'tricycle' | 'van'>('motorbike');
  const [vehiclePlate, setVehiclePlate] = useState('');

  async function submit() {
    if (!name.trim()) { setError('Enter your full name'); return; }
    if (!validateGhanaPhoneLocal(phone)) { setError('Enter a valid phone number'); return; }
    if (!nationalId.trim()) { setError('Enter your Ghana Card / ID number'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!vehiclePlate.trim()) { setError('Enter your vehicle plate number'); return; }

    setError('');
    setLoading(true);
    try {
      await authApi.riderRegister({
        name: name.trim(),
        phone: normalizeGhanaPhone(phone),
        nationalId: nationalId.trim(),
        password,
        vehicleType,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
      });
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <AuthScreen title="Application submitted" subtitle="An admin will review your KYC. You'll be able to sign in once approved.">
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successText}>
            Thanks, {name.split(' ')[0]}! We'll notify you when your account is approved.
          </Text>
        </View>
        <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Become a rider"
      subtitle={step === 'personal' ? 'Step 1 — Personal details' : 'Step 2 — Vehicle details'}
      footer={<LinkButton label="Already registered? Sign in" onPress={() => router.replace('/(auth)/login')} />}
    >
      {step === 'personal' && (
        <>
          <FieldLabel>Full name</FieldLabel>
          <AuthInput value={name} onChangeText={setName} placeholder="As on Ghana Card" />
          <FieldLabel>Phone number</FieldLabel>
          <PhonePrefixInput value={phone} onChangeText={setPhone} />
          <FieldLabel>Ghana Card / ID number</FieldLabel>
          <AuthInput value={nationalId} onChangeText={setNationalId} placeholder="GHA-XXXXXXXX-X" />
          <FieldLabel>Password</FieldLabel>
          <AuthInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Min. 6 characters" />
          <ErrorText message={error} />
          <PrimaryButton label="Continue" onPress={() => { setError(''); setStep('vehicle'); }} />
        </>
      )}

      {step === 'vehicle' && (
        <>
          <FieldLabel>Vehicle type</FieldLabel>
          <View style={styles.chips}>
            {VEHICLE_TYPES.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.chip, vehicleType === v.id && styles.chipActive]}
                onPress={() => setVehicleType(v.id)}
              >
                <Text style={[styles.chipText, vehicleType === v.id && styles.chipTextActive]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FieldLabel>Plate number</FieldLabel>
          <AuthInput
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholder="e.g. GR 1234-21"
            autoCapitalize="characters"
          />
          <ErrorText message={error} />
          <PrimaryButton label="Submit application" onPress={submit} loading={loading} />
          <LinkButton label="Back" onPress={() => setStep('personal')} />
        </>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#E87722', backgroundColor: '#FFF7ED' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#E87722', fontWeight: '600' },
  successBox: { alignItems: 'center', paddingVertical: 24 },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successText: { textAlign: 'center', color: '#374151', lineHeight: 22, fontSize: 15 },
});
