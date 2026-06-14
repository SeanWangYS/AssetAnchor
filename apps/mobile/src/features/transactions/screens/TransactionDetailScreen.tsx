import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Market, TransactionDocument } from '@assetanchor/shared';
import type { TransactionsStackScreenProps } from '../../../core/navigation/types';
import { Avatar, Card, ConfirmDialog, Pnl } from '../../../core/ui';
import { colors, fontFamily, fontSize, numericStyle, radius, spacing } from '../../../core/theme';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../../accounts/accountsStore';
import { useTransactionsStore } from '../transactionsStore';
import { deleteTransaction } from '../transactionService';
import TxnPill from '../components/TxnPill';
import { formatMoney, formatPrice, formatQuantity } from '../transactionsView';

/** TW→台股、US→美股、其餘原碼（forward-compatible）。 */
function marketLabel(market: Market): string {
  return market === 'TW' ? '台股' : market === 'US' ? '美股' : market;
}

/** YYYY-MM-DD → 「2026 / 06 / 12」。 */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return y && m && d ? `${y} / ${m} / ${d}` : date;
}

function realizedOf(t: TransactionDocument): string | undefined {
  if (t.transaction_type !== 'SELL') return undefined;
  const maybe = (t as { realized?: string }).realized;
  return typeof maybe === 'string' ? maybe : undefined;
}

/**
 * TransactionDetailScreen —— 單筆交易檢視 / 編輯 / 刪除（transactions-page-spec T6/T7）。
 * 標的＋類型膠囊 → 交易內容卡（日期/股數/單價/手續費/總成本或總收入，原幣別；
 * 賣出加已實現損益）→ 編輯（複用新增交易 sheet 帶值）→ 刪除（ConfirmDialog）。
 *
 * 單幣別事件（ADR-0005）：無多幣別換算卡 / amounts map。
 */
export default function TransactionDetailScreen({
  navigation,
  route,
}: TransactionsStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const uid = useAuthStore((s) => s.user?.uid);
  const transaction = useTransactionsStore((s) =>
    s.transactions.find((t) => t.transaction_id === transactionId),
  );
  const account = useAccountsStore((s) =>
    s.accounts.find((a) => a.account_id === transaction?.account_id),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!transaction) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>找不到這筆交易</Text>
      </View>
    );
  }

  const t = transaction;
  const buy = t.transaction_type === 'BUY';
  const realized = realizedOf(t);
  const totalLabel = buy ? '總成本' : '總收入';
  const symbolColor = account?.color ?? colors.accent;

  function onDelete() {
    setConfirmDelete(false);
    if (!uid) return;
    navigation.goBack();
    void deleteTransaction(uid, t.transaction_id).catch(() => {
      Alert.alert('刪除失敗', '請稍後再試。');
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headRow}>
        <Avatar symbol={t.symbol} color={symbolColor} size={48} />
        <View style={styles.headText}>
          <Text style={styles.symbol} numberOfLines={1}>
            {t.symbol}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {marketLabel(t.market)}
            {account ? ` · ${account.account_name}` : ''}
          </Text>
        </View>
        <TxnPill type={t.transaction_type} size={12} />
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>交易內容</Text>
        <Kv k="交易日期" v={formatDate(t.transaction_date)} />
        <Kv k="股數" v={`${formatQuantity(t.quantity, t.currency)} 股`} />
        <Kv k="單價" v={formatPrice(t.price, t.currency)} />
        <Kv k="手續費" v={formatMoney(t.fee, t.currency)} />
        <Kv
          k={totalLabel}
          v={formatMoney(t.total, t.currency)}
          strong
          last={realized === undefined}
        />
        {realized !== undefined ? (
          <View style={[styles.kvRow, styles.kvLast]}>
            <Text style={styles.kvKey}>已實現損益</Text>
            <Pnl
              value={Number(realized)}
              display={formatMoney(realized.replace('-', ''), t.currency)}
              signMode="plusminus"
              size={fontSize.text}
              weight="bold"
            />
          </View>
        ) : null}
      </Card>

      <ActionButton
        label="編輯交易"
        color={colors.accent}
        onPress={() => navigation.navigate('EditTransaction', { transactionId: t.transaction_id })}
      />
      <ActionButton label="刪除交易" color={colors.down} onPress={() => setConfirmDelete(true)} />
      <Text style={styles.hint}>編輯會開啟與「新增交易」相同的 sheet 並帶入原值</Text>

      <ConfirmDialog
        visible={confirmDelete}
        title="刪除這筆交易？"
        message="刪除後無法復原，相關持倉計算會一併更新。"
        confirmLabel="刪除"
        danger
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}

interface KvProps {
  k: string;
  v: string;
  strong?: boolean;
  last?: boolean;
}

function Kv({ k, v, strong, last }: KvProps) {
  return (
    <View style={[styles.kvRow, last ? styles.kvLast : null]}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={[styles.kvVal, strong ? styles.kvValStrong : null]}>{v}</Text>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  color: string;
  onPress: () => void;
}

/** 描邊幽靈鈕（對齊 prototype `aa-ghost`：透明底 + 該色 1px 邊 + 該色字）。 */
function ActionButton({ label, color, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: `${color}66` },
        pressed ? styles.actionPressed : null,
      ]}
    >
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, paddingBottom: spacing.xxl },
  missing: {
    flex: 1,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textWeak,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 1 },
  headText: { flex: 1, minWidth: 0 },
  symbol: {
    fontFamily: fontFamily.num.bold,
    fontSize: 17,
    color: colors.textPrimary,
    ...numericStyle,
  },
  sub: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 3,
  },
  card: { marginTop: spacing.lg },
  cardTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  kvLast: { borderBottomWidth: 0 },
  kvKey: { fontFamily: fontFamily.text.regular, fontSize: 13, color: colors.textSecondary },
  kvVal: {
    fontFamily: fontFamily.num.semibold,
    fontSize: 13.5,
    color: colors.textPrimary,
    ...numericStyle,
  },
  kvValStrong: { fontFamily: fontFamily.num.extrabold, fontSize: fontSize.text },
  action: {
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 1,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionPressed: { opacity: 0.7 },
  actionLabel: { fontFamily: fontFamily.text.bold, fontSize: fontSize.text },
  hint: {
    fontFamily: fontFamily.text.regular,
    fontSize: 10.5,
    color: colors.textWeak,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
