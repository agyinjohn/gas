import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';
import { BRAND } from '@getgas/config';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
      <Text style={styles.subtitle}>Find nearby gas stations and order delivery.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phase 1 — Coming next</Text>
        <Text style={styles.cardBody}>
          Nearby stations, location picker, station detail, and checkout will be built in Phase 2.
          The web app at /user remains fully available in the meantime.
        </Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{BRAND.name} Native · iOS & Android</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  cardBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  badge: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.brand}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: colors.brand, fontWeight: '600', fontSize: 12 },
});
