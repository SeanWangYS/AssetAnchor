import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, fontFamily, gradientDirection, radius } from '../theme';

/**
 * Fab —— 浮動操作鈕（aa-core.jsx:260 `IconBtn` accent 版）。
 * 交易頁 / 帳戶頁 / 帳戶清單的新增入口（design.md §1：交易/帳戶 FAB-only、無 header ＋）。
 * accent 漸層圓鈕 + 柔光。預設絕對定位右下；可用 `style` 覆寫位置。
 * icon 槽由 screens 傳入 SVG plus；未傳時 fallback「＋」字符。
 */
interface FabProps {
  onPress: () => void;
  icon?: ReactNode;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Fab({
  onPress,
  icon,
  size = 56,
  accessibilityLabel = '新增',
  style,
}: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width: size, height: size, borderRadius: radius.round },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.accent, `${colors.accent}cc`]}
        start={gradientDirection.diagonal160.start}
        end={gradientDirection.diagonal160.end}
        style={[styles.fill, { borderRadius: radius.round }]}
      >
        {icon ?? <Text style={styles.plus}>＋</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.94 }] },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: {
    fontFamily: fontFamily.num.bold,
    fontSize: 28,
    lineHeight: 30,
    color: colors.onPrimary,
  },
});
