import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

/**
 * Avatar —— 標的代號圓標（aa-core.jsx:150）。
 * 漸層底（150deg，`color → color+cc`）+ 白粗字。
 * monogram：全大寫拉丁代號（AAPL）取首字母；其餘（2330）顯示完整代號。
 * 代號 > 2 字縮小字級。`color` 帶帳戶識別色或標的固定色。
 */
interface AvatarProps {
  /** 標的代號（決定顯示字 + monogram 規則）。 */
  symbol: string;
  /** 圓標漸層基底色（帳戶識別色 / 標的色）。預設 accent。 */
  color?: string;
  size?: number;
}

export default function Avatar({ symbol, color = colors.accent, size = 40 }: AvatarProps) {
  const label = /^[A-Z]+$/.test(symbol) ? (symbol[0] ?? symbol) : symbol;
  const small = label.length > 2;

  return (
    <LinearGradient
      colors={[color, `${color}cc`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.round,
          shadowColor: color,
        },
      ]}
    >
      <Text
        style={[styles.label, { fontSize: small ? size * 0.3 : size * 0.35 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  label: {
    fontFamily: fontFamily.num.extrabold,
    color: colors.onPrimary,
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
});
