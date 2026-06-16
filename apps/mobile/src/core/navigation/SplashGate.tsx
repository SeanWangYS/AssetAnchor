import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AABrandLockup } from '../ui';
import { colors, spacing } from '../theme';

/**
 * SplashGate —— App 啟動 / auth 狀態解析中的閘門畫面（design.md §1 Auth：SplashGate）。
 *
 * 統一字型載入（App.tsx）與 auth resolving（RootNavigator）兩個「尚未可導航」的等待態走同一視覺：
 * page 底 + 品牌鎖定 AABrandLockup（accent 隨主題）+ 細 spinner。
 *
 * TODO(Phase 4 WP-F)：對齊 auth-flow-spec 的 SplashGate 動效 / 過場（目前為靜態品牌 + spinner）。
 */
export default function SplashGate() {
  return (
    <View style={styles.root}>
      <AABrandLockup markSize={44} wordSize={24} glow />
      <ActivityIndicator color={colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.page,
    gap: spacing.xl,
  },
  spinner: { marginTop: spacing.sm },
});
