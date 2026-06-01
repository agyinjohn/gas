import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function RiderProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.phone}>{user?.phone}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  phone: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  logoutBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#DC2626', fontWeight: '600' },
});
