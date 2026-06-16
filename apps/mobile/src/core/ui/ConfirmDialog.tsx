import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, gradientDirection, radius, spacing } from '../theme';

/**
 * ConfirmDialog —— 置中確認框（aa-ui-bits.jsx:5）。
 * 破壞性動作（登出 / 刪除交易 / 停用帳戶）：`danger` → 主鈕跌紅漸層。
 * 省略 `onConfirm` 時為單鈕提示型（「我知道了」）。
 */
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** 主動作標籤（預設「確認」）。 */
  confirmLabel?: string;
  /** 破壞性紅變體（登出 / 刪除）。 */
  danger?: boolean;
  /** 省略時為單鈕提示（只有「我知道了」關閉）。 */
  onConfirm?: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '確認',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const actionColor = danger ? colors.down : colors.accent;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {onConfirm ? (
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.btn,
                  styles.cancel,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.cancelLabel}>取消</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={({ pressed }) => [styles.actionWrap, pressed ? styles.pressed : null]}
              >
                <LinearGradient
                  colors={[actionColor, `${actionColor}cc`]}
                  start={gradientDirection.diagonal160.start}
                  end={gradientDirection.diagonal160.end}
                  style={styles.btn}
                >
                  <Text style={styles.actionLabel}>{confirmLabel}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.actionWrap,
                styles.single,
                pressed ? styles.pressed : null,
              ]}
            >
              <LinearGradient
                colors={[colors.accent, `${colors.accent}cc`]}
                start={gradientDirection.diagonal160.start}
                end={gradientDirection.diagonal160.end}
                style={styles.btn}
              >
                <Text style={styles.actionLabel}>我知道了</Text>
              </LinearGradient>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 300,
    borderRadius: radius.cardLg + 2,
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl - 2,
    paddingBottom: spacing.lg,
    backgroundColor: '#13161E',
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 1,
    marginTop: spacing.lg + 2,
    alignSelf: 'stretch',
  },
  btn: {
    paddingVertical: spacing.md - 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionWrap: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  single: { alignSelf: 'stretch', marginTop: spacing.lg + 2 },
  pressed: { opacity: 0.85 },
  cancelLabel: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.footnote + 0.5,
    color: colors.textSecondary,
  },
  actionLabel: {
    fontFamily: fontFamily.text.extrabold,
    fontSize: fontSize.footnote + 0.5,
    color: colors.onPrimary,
  },
});
