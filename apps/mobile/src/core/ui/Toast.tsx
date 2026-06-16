import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

/**
 * Toast —— 短暫底部提示（e.g.「交易已新增（demo）」、分析頁 refresh）。
 * 受控：parent 持 `visible`，顯示後 `duration` 毫秒淡出並回呼 `onHide`（parent 收掉狀態）。
 * 純展示 + 淡入淡出動畫；無 icon set 依賴。
 */
interface ToastProps {
  visible: boolean;
  message: string;
  /** 自動隱藏毫秒（預設 2200）。 */
  duration?: number;
  onHide: () => void;
}

export default function Toast({ visible, message, duration = 2200, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  // onHide ref keeps the latest callback without restarting the dismiss timer.
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (!visible) return undefined;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
    const showTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => onHideRef.current());
    }, duration);
    return () => clearTimeout(showTimer);
  }, [visible, duration, opacity]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 90,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: '#1B1F29',
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  text: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.footnote,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
