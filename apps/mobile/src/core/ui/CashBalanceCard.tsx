import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme';
import Card from './Card';

/**
 * CashBalanceCard —— 帳戶現金卡（design.md §4：inline 編輯、雙幣別欄、快照時間）。
 * 兩列幣別現金（NT$ / US$）+「手動快照 · 更新於 <時間>」。
 *
 * 純展示 + 受控：金額以字串值傳入（screens 以 Money 預格式化或維持編輯字串），
 * `editable` 控制是否可改；onChange 回傳原始輸入字串（金額解析 / Money 換算交給 screens）。
 * `updatedAt` 為 screens 預格式化的時間字串。
 */
interface CashBalanceCardProps {
  twdValue: string;
  usdValue: string;
  onChangeTwd: (v: string) => void;
  onChangeUsd: (v: string) => void;
  /** 預格式化快照時間（e.g.「2026/06/14 21:30」）。 */
  updatedAt?: string;
  editable?: boolean;
}

export default function CashBalanceCard({
  twdValue,
  usdValue,
  onChangeTwd,
  onChangeUsd,
  updatedAt,
  editable = true,
}: CashBalanceCardProps) {
  return (
    <Card>
      <Text style={styles.heading}>現金餘額</Text>
      <View style={styles.field}>
        <Text style={styles.ccy}>NT$</Text>
        <TextInput
          style={styles.input}
          value={twdValue}
          onChangeText={onChangeTwd}
          editable={editable}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          accessibilityLabel="台幣現金"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.ccy}>US$</Text>
        <TextInput
          style={styles.input}
          value={usdValue}
          onChangeText={onChangeUsd}
          editable={editable}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={colors.textFaint}
          accessibilityLabel="美元現金"
        />
      </View>
      {updatedAt ? <Text style={styles.snapshot}>手動快照 · 更新於 {updatedAt}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
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
    marginTop: spacing.sm,
  },
  ccy: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    width: 34,
    fontVariant: ['tabular-nums'],
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontFamily: fontFamily.num.bold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  snapshot: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
    marginTop: spacing.md,
  },
});
