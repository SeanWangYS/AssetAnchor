import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';
import type { TransactionType } from '@assetanchor/shared';
import { colors, fontFamily, gradientDirection, gradients, radius } from '../../../core/theme';

/**
 * TxnPill —— 買/賣漸層膠囊（transactions-page-spec T2 / design.md §3 色系 2）。
 * 買 紫→洋紅、賣 藍→青（與新增交易 sheet 同一套；非台股紅綠）。135deg。
 *
 * MVP 僅 BUY / SELL 有膠囊；其餘 transaction_type（配息/分割…為 Phase 2+）暫以
 * 中性樣式顯示英文代碼，不致崩潰（forward-compatible）。
 */
const PILL_LABEL: Partial<Record<TransactionType, string>> = {
  BUY: '買入',
  SELL: '賣出',
};

interface TxnPillProps {
  type: TransactionType;
  /** 字級（列表 10、詳情 12）。 */
  size?: number;
}

export default function TxnPill({ type, size = 10 }: TxnPillProps) {
  const grad = type === 'BUY' ? gradients.buy : type === 'SELL' ? gradients.sell : null;
  const label = PILL_LABEL[type] ?? type;
  const vPad = size > 10 ? 3 : 2;
  const hPad = size > 10 ? 10 : 8;

  if (!grad) {
    return (
      <Text
        style={[styles.neutral, { fontSize: size, paddingVertical: vPad, paddingHorizontal: hPad }]}
      >
        {label}
      </Text>
    );
  }

  return (
    <LinearGradient
      colors={grad}
      start={gradientDirection.diagonal135.start}
      end={gradientDirection.diagonal135.end}
      style={[styles.pill, { paddingVertical: vPad, paddingHorizontal: hPad }]}
    >
      <Text style={[styles.label, { fontSize: size }]}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, alignSelf: 'flex-start' },
  label: {
    fontFamily: fontFamily.text.extrabold,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  neutral: {
    fontFamily: fontFamily.text.bold,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
