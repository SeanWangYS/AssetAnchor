import { StyleSheet, Text } from 'react-native';
import { colors, fontFamily } from '../theme';

/**
 * AAWordmark —— 「AssetAnchor」字標（aa-auth.jsx:49）。
 * Asset = 主文字白；Anchor = accent。Nunito extrabold、字距微收。
 */
interface AAWordmarkProps {
  size?: number;
  /** 覆寫 accent（預設跟隨 theme）。 */
  color?: string;
}

export default function AAWordmark({ size = 28, color = colors.accent }: AAWordmarkProps) {
  return (
    <Text style={[styles.word, { fontSize: size }]} numberOfLines={1}>
      <Text style={styles.asset}>Asset</Text>
      <Text style={{ color }}>Anchor</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  word: {
    fontFamily: fontFamily.num.extrabold,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  asset: { color: colors.textPrimary },
});
