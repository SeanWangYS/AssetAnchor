import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/**
 * Input —— 表單欄位。對齊 prototype `AuField`（aa-auth.jsx:95）：
 * 標籤（粗、字距）、可選左側 icon 槽、focus 時 accent 邊 + 柔光環、
 * 錯誤時跌紅邊 + 錯誤訊息列。secure 切換交給 screens 透過 `rightSlot` 提供眼睛鈕
 * （core/ui 不內建 icon set；保持純展示、props 驅動）。
 */
interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  /** 左側 icon 槽（screens 傳入 SVG icon；focus/error 顏色由 screens 自理）。 */
  leftIcon?: ReactNode;
  /** 右側槽（密碼顯示切換鈕等）。 */
  rightSlot?: ReactNode;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightSlot,
  style,
  onFocus,
  onBlur,
  editable,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  // 唯讀/停用視覺（visual-audit P3-16）：error 紅框優先於 disabled（樣式順序）。
  const disabled = editable === false;
  const borderColor = error
    ? colors.down
    : focused
      ? colors.accent
      : disabled
        ? 'transparent'
        : colors.border;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {/* collapsable={false}：focus 時才套的 focusRing 陰影會觸發 Fabric view-flattening 的
          remove+insert，使內層 TextInput 當場失焦、鍵盤打不進（RN #45798）。釘住此 view
          不被 flatten 即可在新架構下正常輸入。見 ADR-0009。 */}
      <View
        collapsable={false}
        style={[
          styles.field,
          disabled && !error ? styles.fieldDisabled : null,
          { borderColor },
          focused && !error ? styles.focusRing : null,
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, disabled ? styles.inputDisabled : null, style]}
          editable={editable}
          placeholderTextColor={colors.textFaint}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  fieldDisabled: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'transparent' },
  inputDisabled: { color: colors.textSecondary },
  label: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  focusRing: {
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { flexShrink: 0 },
  right: { flexShrink: 0 },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  err: { fontFamily: fontFamily.text.medium, fontSize: fontSize.label, color: colors.down },
});
