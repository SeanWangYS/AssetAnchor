import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme';

/**
 * LoadingView —— 置中載入狀態（首次載入、尚無資料時）。
 * 內建 RN ActivityIndicator（tint = accent）+ 可選 label。MVP 不用 skeleton。
 */
interface LoadingViewProps {
  /** 可選說明（如「載入持倉中…」）。 */
  label?: string;
}

export default function LoadingView({ label }: LoadingViewProps) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
  label: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
