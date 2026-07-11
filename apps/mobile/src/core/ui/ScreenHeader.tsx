import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * ScreenHeader —— 四 tab 落地頁統一標題列（unify-screen-headers；
 * holdings-overview-spec §3.1 / analysis-page-spec §3.1：標題 23px/800 左對齊）。
 * 自帶 safe-area top inset（useSafeAreaInsets），取代原生 stack header——
 * 落地頁在 stack 設 headerShown:false 後掛本元件；push 子頁仍用原生 header（返回鍵）。
 * `right` slot 給頁面放操作鈕（持倉 🔔/＋、交易 日曆）。
 */
interface ScreenHeaderProps {
  title: string;
  right?: ReactNode;
}

export default function ScreenHeader({ title, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right != null ? <View style={styles.actions}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.sm,
    backgroundColor: colors.screen,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.screenTitle,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
