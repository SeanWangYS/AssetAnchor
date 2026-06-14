import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * DisplayPrefsScreen —— 顯示偏好（幣別 TWD/USD + 主題 accent）。
 *
 * TODO(Phase 4 WP-E)：幣別切換（Segmented TWD/USD）+ accent 色票（ColorSwatches）+ 關光暈開關
 * （design.md §1 設定 / §3 Tweaks）。目前為可導航的 themed 佔位。
 */
export default function DisplayPrefsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>顯示偏好</Text>
        <Text style={styles.subtitle}>幣別與主題設定將於 Phase 4 補上</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, padding: spacing.page },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
  },
});
