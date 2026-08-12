import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

// No events/spots-style backend exists for the social feed yet — this tab
// is visible to whoever holds FUNC_TAB_FEED (today, ADMIN) but stays a
// placeholder rather than building speculative screens against a service
// that doesn't exist (same discipline skateboard-ui-backend's CLAUDE.md
// documents for events-be/spots-be).
export default function FeedScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Feed</ThemedText>
        <ThemedText type="default" themeColor="textDim" style={styles.text}>
          Coming soon.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
