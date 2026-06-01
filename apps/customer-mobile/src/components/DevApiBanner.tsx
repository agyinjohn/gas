import { Text, StyleSheet } from 'react-native';
import { resolveMobileApiUrl } from '@getgas/mobile-core';

/** Shows which API URL the app is using (development only) */
export function DevApiBanner() {
  if (!__DEV__) return null;

  const url = resolveMobileApiUrl();

  return (
    <Text style={styles.banner} selectable>
      API: {url}
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    fontSize: 11,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: 'center',
  },
});
