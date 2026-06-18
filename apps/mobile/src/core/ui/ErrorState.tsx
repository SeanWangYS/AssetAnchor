import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/**
 * ErrorState —— 資料載入錯誤狀態（與 EmptyState 同視覺語彙）。
 * icon 方塊（極淡漸層 + 1px 邊，預設 danger 色調暗示）+ 標題 + 說明 + 可選「重試」描邊鈕。
 * icon 由 screens 傳入 SVG（缺則不顯方塊）；core/ui 不內建 icon set。
 */
interface ErrorStateProps {
  /** 主訊息（如「載入失敗」）。 */
  message: string;
  /** 次說明（如錯誤細節 / 建議）。 */
  subtitle?: string;
  icon?: ReactNode;
  /** 重試動作；提供時顯示描邊「重試」鈕。 */
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  message,
  subtitle,
  icon,
  onRetry,
  retryLabel = '重試',
}: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      {icon ? (
        <LinearGradient
          colors={['rgba(255,94,98,0.10)', 'rgba(255,94,98,0.03)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.35, y: 1 }}
          style={styles.iconBox}
        >
          {icon}
        </LinearGradient>
      ) : null}
      <Text style={styles.title}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={onRetry}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
        >
          <Text style={styles.actionLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl + 4,
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,94,98,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md + 2,
  },
  title: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
  },
  action: {
    marginTop: spacing.md + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  actionLabel: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
});
