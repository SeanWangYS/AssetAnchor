import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Money, type AccountInput, type Currency } from '@assetanchor/shared';
import type { AccountsStackScreenProps } from '../../../core/navigation/types';
import { useAuthStore } from '../../auth/authStore';
import { useAccountsStore } from '../accountsStore';
import { useTransactionsStore } from '../../transactions/transactionsStore';
import {
  cashDisplay,
  setAccountActive,
  toCashBalances,
  updateAccount,
  updateCashBalances,
} from '../accountService';
import AccountForm from '../components/AccountForm';
import { EditIcon, PlusIcon, TrashIcon } from '../components/AccountIcons';
import {
  accountMonogram,
  accountTypeLabel,
  brokerLabel,
  currencyPrefix,
  formatMoney,
  formatSnapshot,
  holdingsForAccount,
  holdingsValueByCurrency,
} from '../accountDisplay';
import {
  Avatar,
  Button,
  CashBalanceCard,
  ConfirmDialog,
  EmptyState,
  ListItem,
  Sheet,
  Toast,
} from '../../../core/ui';
import {
  colors,
  fontFamily,
  fontSize,
  gradientDirection,
  gradients,
  numericStyle,
  radius,
  spacing,
} from '../../../core/theme';

export default function AccountDetailScreen({
  route,
  navigation,
}: AccountsStackScreenProps<'AccountDetail'>) {
  const { accountId } = route.params;
  const uid = useAuthStore((s) => s.user?.uid);
  const account = useAccountsStore((s) => s.accounts.find((a) => a.account_id === accountId));
  const transactions = useTransactionsStore((s) => s.transactions);

  const [editing, setEditing] = useState(false); // 現金 inline 編輯態
  const [usd, setUsd] = useState('');
  const [twd, setTwd] = useState('');
  const [cashError, setCashError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false); // 編輯帳戶 sheet
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'reactivate' | 'delete'>(null);

  const positions = useMemo(
    () => (account ? holdingsForAccount(transactions, accountId) : []),
    [account, transactions, accountId],
  );
  const hasTxns = useMemo(
    () => transactions.some((t) => t.account_id === accountId),
    [transactions, accountId],
  );

  useLayoutEffect(() => {
    if (!account) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="編輯帳戶"
          hitSlop={10}
          onPress={() => setFormOpen(true)}
        >
          <EditIcon size={22} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation, account]);

  if (!account || !uid) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>找不到帳戶</Text>
      </View>
    );
  }

  const acct = account;
  const userId = uid;
  const base = acct.base_currency;

  // —— hero：帳戶總值（持股市值 + 現金，基礎幣別）+ 拆分小字（accounts A5）——
  // 跨幣別需即時 FX（本 feature 不引匯率服務）；此處僅合計 base_currency 同幣別部分，
  // 非基礎幣別的持股/現金以「另計」小字分列，不靜默混算（對齊 §5 / fail-honest）。
  const holdingSums = holdingsValueByCurrency(positions);
  const holdingBase = holdingSums[base] ?? Money.zero(base);
  const cashBaseStr = acct.cash_balances[base];
  const cashBase = cashBaseStr ? Money.fromDecimalString(cashBaseStr, base) : Money.zero(base);
  const totalBase = holdingBase.add(cashBase);

  /** 非基礎幣別的「另計」項（持股 + 現金合併同幣別），用於 hero 下方提示。 */
  const otherCurrencyLines = buildOtherCurrencyLines(base, holdingSums, acct.cash_balances);

  function startEdit() {
    setCashError(null);
    setUsd(cashDisplay(acct.cash_balances.USD, 'USD'));
    setTwd(cashDisplay(acct.cash_balances.TWD, 'TWD'));
    setEditing(true);
  }

  async function saveCash() {
    setCashError(null);
    try {
      const balances = toCashBalances({ USD: usd, TWD: twd });
      await updateCashBalances(userId, accountId, balances);
      setEditing(false);
      setToast('現金餘額已更新');
    } catch {
      setCashError('請輸入有效數字');
    }
  }

  async function onEditAccount(input: AccountInput) {
    await updateAccount(userId, accountId, input);
    setFormOpen(false);
  }

  async function confirmAction() {
    const action = confirm;
    setConfirm(null);
    if (action === 'deactivate' || action === 'reactivate') {
      await setAccountActive(userId, accountId, action === 'reactivate');
      navigation.goBack();
    }
    // 'delete'：MVP 為單鈕提示型（有交易時不可刪）；無 onConfirm 分支不會走到這裡。
  }

  // exactOptionalPropertyTypes：updatedAt?: string 不接受顯式 undefined，故有值才展開此 prop。
  const snapshot = formatSnapshot(acct.cash_balances_updated_at);
  const snapshotProp = snapshot ? { updatedAt: snapshot } : {};

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* —— Hero：帳戶色光暈 —— */}
        <View style={[styles.heroGlow, { shadowColor: acct.color }]}>
          <LinearGradient
            colors={gradients.cardSurface}
            start={gradientDirection.diagonal160.start}
            end={gradientDirection.diagonal160.end}
            style={styles.hero}
          >
            {/* 帳戶色頂部光暈 overlay */}
            <LinearGradient
              pointerEvents="none"
              colors={[`${acct.color}33`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroAccent}
            />
            <View style={styles.heroHead}>
              <Avatar symbol={accountMonogram(acct.account_name)} color={acct.color} size={44} />
              <View style={styles.heroHeadText}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {acct.account_name}
                </Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {brokerLabel(acct.broker)} · {accountTypeLabel(acct.account_type)}
                </Text>
              </View>
              {!acct.is_active ? <Text style={styles.inactiveBadge}>已停用</Text> : null}
            </View>

            <Text style={styles.heroLabel}>帳戶總值</Text>
            <Text style={styles.heroValue} numberOfLines={1}>
              {currencyPrefix(base)} {totalBase.toDisplayString()}
            </Text>

            <View style={styles.splitRow}>
              <Text style={styles.splitText}>
                持股 {currencyPrefix(base)} {holdingBase.toDisplayString()}
              </Text>
              <Text style={styles.splitDot}>·</Text>
              <Text style={styles.splitText}>
                現金 {currencyPrefix(base)} {cashBase.toDisplayString()}
              </Text>
            </View>
            {otherCurrencyLines.length > 0 ? (
              <Text style={styles.otherCcy}>
                另計 {otherCurrencyLines.join('、')}（依當日匯率換算）
              </Text>
            ) : null}
          </LinearGradient>
        </View>

        {/* —— 現金餘額 inline 編輯（accounts A6 / B 案）—— */}
        <View style={styles.cashBlock}>
          {editing ? (
            <>
              <CashBalanceCard
                twdValue={twd}
                usdValue={usd}
                onChangeTwd={setTwd}
                onChangeUsd={setUsd}
                editable
                {...snapshotProp}
              />
              {cashError ? <Text style={styles.cashErr}>{cashError}</Text> : null}
              <View style={styles.cashActions}>
                <View style={styles.cashActionItem}>
                  <Button title="取消" variant="secondary" onPress={() => setEditing(false)} />
                </View>
                <View style={styles.cashActionItem}>
                  <Button title="儲存" onPress={saveCash} />
                </View>
              </View>
            </>
          ) : (
            <View>
              <View style={styles.cashHeaderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="編輯現金餘額"
                  hitSlop={8}
                  style={styles.cashEditBtn}
                  onPress={startEdit}
                >
                  <EditIcon size={16} color={colors.accent} />
                  <Text style={styles.cashEditText}>編輯</Text>
                </Pressable>
              </View>
              <CashBalanceCard
                twdValue={cashDisplay(acct.cash_balances.TWD, 'TWD')}
                usdValue={cashDisplay(acct.cash_balances.USD, 'USD')}
                onChangeTwd={() => undefined}
                onChangeUsd={() => undefined}
                editable={false}
                {...snapshotProp}
              />
            </View>
          )}
        </View>

        {/* —— 該帳戶持股 —— */}
        <Text style={styles.sectionTitle}>持股</Text>
        {positions.length === 0 ? (
          <EmptyState
            icon={<PlusIcon size={26} color={colors.accent} />}
            title="此帳戶尚無持股"
            subtitle="到「交易」分頁為此帳戶記錄一筆買入"
          />
        ) : (
          <View style={styles.holdings}>
            {positions.map((p) => (
              <ListItem
                key={`${p.market}_${p.symbol}`}
                title={p.symbol}
                subtitle={`${shares(p.quantity, p.currency)} 股 · 均價 ${Money.fromDecimalString(p.averageCost, p.currency).toDisplayString()}`}
                right={
                  <Text style={styles.holdingValue}>{formatMoney(p.totalCost, p.currency)}</Text>
                }
              />
            ))}
          </View>
        )}

        {/* —— 危險操作：停用 / 重新啟用 + 刪除 —— */}
        <View style={styles.danger}>
          {acct.is_active ? (
            <Button title="停用帳戶" variant="secondary" onPress={() => setConfirm('deactivate')} />
          ) : (
            <Button title="重新啟用帳戶" onPress={() => setConfirm('reactivate')} />
          )}
          <Pressable
            accessibilityRole="button"
            style={styles.deleteBtn}
            onPress={() => setConfirm('delete')}
          >
            <TrashIcon size={18} color={colors.down} />
            <Text style={styles.deleteText}>刪除帳戶</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 編輯帳戶 sheet（共用 AccountForm；不需新增 nav route，留在 feature 內）。 */}
      <Sheet visible={formOpen} title="編輯帳戶" onClose={() => setFormOpen(false)}>
        <AccountForm
          initial={{
            account_name: acct.account_name,
            broker: acct.broker,
            account_type: acct.account_type,
            base_currency: acct.base_currency,
            market: acct.market,
            color: acct.color,
            notes: acct.notes,
          }}
          submitLabel="儲存"
          onSubmit={onEditAccount}
        />
      </Sheet>

      {/* 停用確認（破壞性）。 */}
      <ConfirmDialog
        visible={confirm === 'deactivate'}
        danger
        title="停用此帳戶？"
        message="停用為軟刪除，可隨時重新啟用；該帳戶持股將不再列入啟用帳戶清單。"
        confirmLabel="停用"
        onConfirm={confirmAction}
        onClose={() => setConfirm(null)}
      />

      {/* 重新啟用確認。 */}
      <ConfirmDialog
        visible={confirm === 'reactivate'}
        title="重新啟用此帳戶？"
        message="帳戶將回到啟用清單。"
        confirmLabel="重新啟用"
        onConfirm={confirmAction}
        onClose={() => setConfirm(null)}
      />

      {/* 刪除：有交易時為單鈕提示型（先處理交易，accounts A8）；無交易亦先導向停用。 */}
      <ConfirmDialog
        visible={confirm === 'delete'}
        danger
        title="無法直接刪除帳戶"
        message={
          hasTxns
            ? '此帳戶仍有交易紀錄。請先刪除或轉移相關交易，或改用「停用帳戶」。'
            : '為保留資料完整性，請改用「停用帳戶」（軟刪除、可復原）。'
        }
        onClose={() => setConfirm(null)}
      />

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </View>
  );
}

/** 股數顯示（toNumber 為 UI 顯示逃生門，對齊 HoldingsOverview）。 */
function shares(quantity: string, currency: Currency): string {
  return Money.fromDecimalString(quantity, currency).toNumber().toLocaleString();
}

/** 非基礎幣別的另計項（持股市值 + 現金，同幣別合併）。 */
function buildOtherCurrencyLines(
  base: Currency,
  holdingSums: Partial<Record<Currency, Money>>,
  cash: Partial<Record<Currency, string>>,
): string[] {
  const others = new Map<Currency, Money>();
  for (const [ccy, money] of Object.entries(holdingSums)) {
    if (ccy === base || !money) continue;
    others.set(ccy as Currency, money);
  }
  for (const [ccy, str] of Object.entries(cash)) {
    if (ccy === base || !str) continue;
    const c = ccy as Currency;
    const prev = others.get(c) ?? Money.zero(c);
    others.set(c, prev.add(Money.fromDecimalString(str, c)));
  }
  return [...others.entries()].map(
    ([ccy, money]) => `${currencyPrefix(ccy)} ${money.toDisplayString()}`,
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screen },
  content: { padding: spacing.page, paddingBottom: spacing.xxl, gap: spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screen,
  },
  muted: {
    fontFamily: fontFamily.text.regular,
    color: colors.textSecondary,
    fontSize: fontSize.text,
  },

  // hero
  heroGlow: {
    borderRadius: radius.cardLg,
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
  },
  hero: {
    position: 'relative',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg + 2,
    overflow: 'hidden',
  },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroHeadText: { flex: 1, gap: 2 },
  heroName: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  heroMeta: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  inactiveBadge: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.label,
    color: colors.textWeak,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  heroLabel: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  heroValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: fontSize.hero,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    ...numericStyle,
  },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  splitText: {
    fontFamily: fontFamily.num.medium,
    fontSize: fontSize.footnote,
    color: colors.textSecondary,
    ...numericStyle,
  },
  splitDot: { color: colors.textWeak },
  otherCcy: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
    marginTop: spacing.xs,
  },

  // cash
  cashBlock: { gap: spacing.sm },
  cashHeaderRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.xs },
  cashEditBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cashEditText: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.footnote,
    color: colors.accent,
  },
  cashErr: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.down,
    marginTop: spacing.xs,
  },
  cashActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  cashActionItem: { flex: 1 },

  // holdings
  sectionTitle: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
  },
  holdings: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  holdingValue: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
    ...numericStyle,
  },

  // danger
  danger: { gap: spacing.md, marginTop: spacing.sm },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  deleteText: { fontFamily: fontFamily.text.semibold, fontSize: fontSize.text, color: colors.down },
});
