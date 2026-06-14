import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AABrandLockup } from '../../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/**
 * AboutScreen —— 關於（品牌鎖定 + 版本 / 條款）。
 *
 * TODO(Phase 4 WP-E)：版本號 / 條款 / 致謝（design.md §1 設定「其他 / 關於」、§2 缺畫面③）。
 * 目前為可導航的 themed 佔位，已放 AABrandLockup 品牌組件。
 */
export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.placeholder}>
        <AABrandLockup markSize={40} wordSize={22} glow />
        <Text style={styles.subtitle}>版本資訊與條款將於 Phase 4 補上</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { flexGrow: 1, padding: spacing.page },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
  },
});
