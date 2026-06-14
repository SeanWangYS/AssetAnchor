import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * ProfileScreen —— 個人資料編輯（顯示名稱 / email 等）。
 *
 * TODO(Phase 4 WP-E)：顯示/編輯個人資料（design.md §1 設定「偏好 / 個人資料」、§2 缺畫面②）。
 * 目前為可導航的 themed 佔位。
 */
export default function ProfileScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>個人資料</Text>
        <Text style={styles.subtitle}>個人資料編輯將於 Phase 4 補上</Text>
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
