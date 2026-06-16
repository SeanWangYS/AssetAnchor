import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';

/**
 * GoogleButton —— SignIn / SignUp 共用的次要 ghost 按鈕（auth-flow-spec §3）。
 *
 * core/ui 的 `Button` secondary 不含圖示槽，故 Google 鈕（彩色 G + 文字）做成
 * feature 內小元件：surface 底 + 1px 邊（對齊 Button secondary 視覺）、彩色 G、
 * loading 時顯示「連線中…」+ spinner。Google 多色 G 為品牌標誌，hex 為品牌色，
 * 非設計 token，故 inline（此處屬例外，spec 指名彩色 G）。
 */
interface GoogleButtonProps {
  /** 按鈕文案（登入：使用 Google 登入；註冊：使用 Google 註冊）。 */
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function GoogleButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: GoogleButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      onPress={off ? undefined : onPress}
      disabled={off}
      style={({ pressed }) => [styles.btn, { opacity: off ? 0.62 : pressed ? 0.85 : 1 }]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={colors.text} /> : <GoogleGlyph size={18} />}
        <Text style={styles.label}>{loading ? '連線中…' : label}</Text>
      </View>
    </Pressable>
  );
}

/** Google 多色「G」標誌（react-native-svg；品牌色非 token，inline）。 */
export function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    color: colors.text,
    letterSpacing: 0.5,
  },
});
