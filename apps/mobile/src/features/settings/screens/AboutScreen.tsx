import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AABrandLockup, Card } from '../../../core/ui';
import { colors, fontFamily, fontSize, spacing } from '../../../core/theme';

/** app 版本（對齊 apps/mobile/app.config.ts 的 version；MVP 直接內嵌）。 */
const APP_VERSION = '0.0.1';

/**
 * AboutScreen —— 關於（design.md §1 設定「其他 / 關於」、§2 缺畫面③）。
 *
 * 品牌鎖定（圓環錨點）+ app 名稱 / 版本 / 標語與簡介。純靜態展示。
 */
export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.brand}>
        <AABrandLockup markSize={48} wordSize={26} glow />
        <Text style={styles.tagline}>你的資產，一處錨定</Text>
        <Text style={styles.version}>版本 {APP_VERSION}</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>關於 AssetAnchor</Text>
        <Text style={styles.body}>
          AssetAnchor 是一款個人投資組合追蹤工具，協助你記錄跨市場（台股 TWD、美股
          USD）的交易與持倉，並在顯示時即時換算合計、檢視報酬與資產配置分析。
        </Text>
      </Card>

      <Text style={styles.footnote}>© 2026 AssetAnchor · 本資料僅供個人記錄，非投資建議。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  tagline: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textSecondary,
  },
  version: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.footnote,
    color: colors.textWeak,
  },
  card: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  footnote: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
    textAlign: 'center',
  },
});
