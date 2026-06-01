import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AuthScreen, FieldLabel, AuthInput, PrimaryButton, PhonePrefixInput, ErrorText,
} from '@getgas/mobile-ui';
import { normalizeGhanaPhone, validateGhanaPhoneLocal } from '@getgas/domain';
import { authApi, usersApi } from '@getgas/mobile-core';
import { useAuth } from '@/providers/AuthProvider';

export default function CompleteProfileScreen() {
  const { user, updateUser, markProfileComplete } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!validateGhanaPhoneLocal(phone)) { setError('Enter a valid Ghana phone number'); return; }
    setError('');
    setLoading(true);
    const e164 = normalizeGhanaPhone(phone);
    try {
      if (name.trim() !== user?.name) {
        await usersApi.updateMe({ name: name.trim() });
      }
      await authApi.addPhone(e164);
      await updateUser({ name: name.trim(), phone: e164 });
      markProfileComplete();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Could not save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Complete your profile"
      subtitle="Add your phone number so riders can reach you"
    >
      <View style={styles.note}>
        <Text style={styles.noteText}>Signed in with Google — one quick step before ordering.</Text>
      </View>
      <FieldLabel>Full name</FieldLabel>
      <AuthInput value={name} onChangeText={setName} placeholder="Your name" />
      <FieldLabel>Phone number</FieldLabel>
      <PhonePrefixInput value={phone} onChangeText={setPhone} />
      <ErrorText message={error} />
      <PrimaryButton label="Continue" onPress={submit} loading={loading} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  noteText: { color: '#9A3412', fontSize: 13, lineHeight: 18 },
});
