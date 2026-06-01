import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function RiderDashboard() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] ?? 'Rider'} 🛵</Text>

      <View style={styles.statusCard}>
        <View style={[styles.dot, { backgroundColor: colors.offline }]} />
        <Text style={styles.statusText}>Offline</Text>
      </View>
      <Text style={styles.hint}>
        Online toggle, dispatch offers, and background GPS arrive in Phase 5–6.
        Use /rider on web until then.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 20 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '600', color: colors.text },
  hint: { fontSize: 14, color: colors.textMuted, marginTop: 16, lineHeight: 20 },
});
