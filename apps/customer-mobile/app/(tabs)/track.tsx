import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export default function TrackScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Track delivery</Text>
      <Text style={styles.subtitle}>Live map tracking arrives in Phase 4.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
