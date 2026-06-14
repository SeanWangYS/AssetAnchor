import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * ListItem —— 分組清單列（設定 / 帳戶清單 / 標的列）。對齊原型清單列：
 * 可選帳戶識別色圓點、標題 + 次標、右側自訂槽（金額 / Pnl / chevron）、
 * `dimmed`（停用帳戶半透明）。底線用極淡 divider。
 */
interface ListItemProps {
  title: string;
  subtitle?: string;
  /** 帳戶識別色圓點（accounts 已反轉持倉 D3，識別色回歸）。 */
  colorDot?: string;
  /** 左側自訂槽（Avatar 等），優先於 colorDot。 */
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  dimmed?: boolean;
  /** 是否畫底部分隔線（清單最後一列可關）。 */
  divider?: boolean;
}

export function ListItem({
  title,
  subtitle,
  colorDot,
  left,
  right,
  onPress,
  dimmed = false,
  divider = true,
}: ListItemProps) {
  const content = (
    <View style={[styles.row, divider ? styles.divider : null, dimmed ? styles.dimmed : null]}>
      {left ?? (colorDot ? <View style={[styles.dot, { backgroundColor: colorDot }]} /> : null)}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.page,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: { opacity: 0.6 },
  dimmed: { opacity: 0.5 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.text.medium, fontSize: fontSize.text, color: colors.textPrimary },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
});
