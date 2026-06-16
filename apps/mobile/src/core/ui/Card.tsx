import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, gradientDirection, gradients, radius, spacing } from '../theme';

/**
 * Card —— fintech 卡面（aa-core.jsx:163）。
 * cardSurface 漸層（160deg 極淡白疊在 screen 上）+ 1px 邊 + 柔外陰影。
 * 頂部 1px 內高光（RN 無 inset shadow，以頂部 hairline overlay 近似）。
 * `glow`：強調卡（總報酬率 / 計算預覽 / donut）的 accent 色光暈陰影。
 */
interface CardProps {
  children: ReactNode;
  /** accent 光暈（強調卡）。 */
  glow?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** 卡內距覆寫（預設 cardInnerLg=16）。 */
  padding?: number;
}

export default function Card({ children, glow = false, onPress, style, padding }: CardProps) {
  const body = (
    <LinearGradient
      colors={gradients.cardSurface}
      start={gradientDirection.diagonal160.start}
      end={gradientDirection.diagonal160.end}
      style={[
        styles.card,
        { padding: padding ?? spacing.cardInnerLg },
        glow ? styles.glow : styles.shadow,
        style,
      ]}
    >
      {/* 頂部內高光近似（inset 1px 白） */}
      <View pointerEvents="none" style={styles.topHighlight} />
      {children}
    </LinearGradient>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.92 },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
