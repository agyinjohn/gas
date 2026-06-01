import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export default function RiderOrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your trips</Text>
      <Text style={styles.subtitle}>Active and past orders — Phase 5.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 18, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8 },
});
