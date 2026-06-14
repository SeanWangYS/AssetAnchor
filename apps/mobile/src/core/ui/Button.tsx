import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, gradientDirection, radius, spacing } from '../theme';

/**
 * Button —— 主操作鈕。對齊 prototype `AuPrimary`（aa-auth.jsx:138）：
 * accent 漸層底（160deg）、字距加寬、loading 時顯示 spinner。
 *
 * variant：
 * - `primary`：accent 漸層（fintech 主鈕，原型登入/建立帳號）。
 * - `gradient`：等同 primary 的別名（語意明確；screens 可任選）。
 * - `secondary`：低調 surface 底 + 1px 邊（次要動作）。
 * - `danger`：跌紅實心（破壞性，少用；破壞性確認優先用 ConfirmDialog）。
 */
type Variant = 'primary' | 'gradient' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const off = disabled || loading;
  const isGradient = variant === 'primary' || variant === 'gradient';

  const inner = loading ? (
    <ActivityIndicator
      color={isGradient || variant === 'danger' ? colors.onPrimary : colors.text}
    />
  ) : (
    <Text
      style={[
        styles.label,
        { color: isGradient || variant === 'danger' ? colors.onPrimary : colors.text },
      ]}
    >
      {title}
    </Text>
  );

  if (isGradient) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: off, busy: loading }}
        onPress={off ? undefined : onPress}
        disabled={off}
        style={({ pressed }) => [styles.shadow, { opacity: off ? 0.62 : pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={[colors.accent, `${colors.accent}cc`]}
          start={gradientDirection.diagonal160.start}
          end={gradientDirection.diagonal160.end}
          style={styles.btn}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      onPress={off ? undefined : onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        variant === 'danger' ? styles.danger : styles.secondary,
        { opacity: off ? 0.62 : pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.center}>{inner}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.lg,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  btn: {
    minHeight: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
  label: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    letterSpacing: 0.5,
  },
});
