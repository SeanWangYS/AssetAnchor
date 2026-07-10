import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Money, type AccountInput, type Currency, type RateMap } from '@assetanchor/shared';
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
} from '../accountDisplay';
import {
  Avatar,
  Button,
  CashBalanceCard,
  ConfirmDialog,
  EmptyState,
  ListItem,
  Pnl,
  Sheet,
  Toast,
} from '../../../core/ui';
import { useExchangeRatesStore } from '../../../services/exchange-rates';
import {
  quoteErrorFor,
  quoteFor,
  useQuotes,
  useQuotesStore,
  useRefreshQuotesOnFocus,
} from '../../../services/quotes';
import {
  computeHoldingsHero,
  countQuoteNotFound,
  positionValuation,
  toDisplay,
} from '../../../services/valuation';
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
  const rates = useExchangeRatesStore((s) => s.rates);
  const quoteErrors = useQuotesStore((s) => s.errors);

  const [editing, setEditing] = useState(false); // 現金 inline 編輯態
  const [usd, setUsd] = useState('');
  const [twd, setTwd] = useState('');
  const [cashError, setCashError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false); // 編輯帳戶 sheet
  const [confirm, setConfirm] = useState<null | 'deactivate' | 'reactivate' | 'delete'>(null);

  const { positions, skipped } = useMemo(
    () => (account ? holdingsForAccount(transactions, accountId) : { positions: [], skipped: [] }),
    [account, transactions, accountId],
  );
  const hasTxns = useMemo(
    () => transactions.some((t) => t.account_id === accountId),
    [transactions, accountId],
  );

  // 報價（ADR-0006 雙層 cache）：為該帳戶持股 on-demand 載入 + focus 檢查新鮮度。
  const quoteTargets = useMemo(
    () => positions.map((p) => ({ market: p.market, symbol: p.symbol, currency: p.currency })),
    [positions],
  );
  const quotes = useQuotes(quoteTargets);
  useRefreshQuotesOnFocus(quoteTargets);
  function retryQuotes() {
    void useQuotesStore.getState().loadFor(quoteTargets, { force: true });
  }

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
        <EmptyState title="找不到帳戶" subtitle="可能已被刪除或停用" />
      </View>
    );
  }

  const acct = account;
  const userId = uid;
  const base = acct.base_currency;

  // —— hero：帳戶市值＝持股市值（真實報價，基礎幣別）＋現金（accounts A5，B 案）——
  // computeHoldingsHero 逐持倉以報價計市值、跨幣別以 rates（退 demo FX）換算進基礎幣別；
  // 現金各幣別亦換算進基礎幣別後併入帳戶市值。缺報價/過期複用 live-quotes 降級（不以成本冒充）。
  const hero = computeHoldingsHero(
    positions,
    (market, symbol) => quoteFor(quotes, market, symbol),
    rates,
    base,
    Date.now(),
    (market, symbol) => quoteErrorFor(quoteErrors, market, symbol),
  );
  const heroNotFound = hero
    ? 0
    : countQuoteNotFound(
        positions,
        (market, symbol) => quoteFor(quotes, market, symbol),
        (market, symbol) => quoteErrorFor(quoteErrors, market, symbol),
      );

  // 現金合計（各幣別換算進基礎幣別；無法換算者跳過並列入揭露，不靜默混算）。
  const { cash: cashBase, unconverted: cashUnconverted } = cashInBase(
    acct.cash_balances,
    rates,
    base,
  );
  // 持股市值（基礎幣別）：報價就緒→hero.value；無持股→0；有持股但全缺報價→null（載入中）。
  const holdingsValue = hero ? hero.value : positions.length === 0 ? 0 : null;
  const accountValue = holdingsValue === null ? null : holdingsValue + cashBase.toNumber();

  const dp = base === 'USD' ? 2 : 0;
  const fmtNum = (n: number): string =>
    n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtBase = (n: number): string => `${currencyPrefix(base)} ${fmtNum(n)}`;
  const fmtBaseAbs = (n: number): string => `${currencyPrefix(base)} ${fmtNum(Math.abs(n))}`;

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

            <Text style={styles.heroLabel}>帳戶市值</Text>
            {accountValue !== null ? (
              <Text style={styles.heroValue} numberOfLines={1}>
                {fmtBase(accountValue)}
              </Text>
            ) : heroNotFound > 0 ? (
              // 全缺報價且含查無代號：顯示引導而非無限「載入中」（對齊 HoldingsOverview）。
              <Text style={styles.heroNotFound} numberOfLines={2}>
                {heroNotFound} 檔查無報價代號{'\n'}請檢查交易的市場/代號設定
              </Text>
            ) : (
              <Text style={styles.heroValue} numberOfLines={1}>
                報價載入中…
              </Text>
            )}

            {/* 拆分小字：持股市值 · 現金（持股市值缺報價時「更新中…」，現金照常）。 */}
            <View style={styles.splitRow}>
              <Text style={styles.splitText}>
                持股市值 {holdingsValue === null ? '更新中…' : fmtBase(holdingsValue)}
              </Text>
              <Text style={styles.splitDot}>·</Text>
              <Text style={styles.splitText}>現金 {fmtBase(cashBase.toNumber())}</Text>
            </View>

            {/* 成本 / 未實現損益列（B 案；報價就緒才呈現，不以成本冒充市值）。 */}
            {hero ? (
              <View style={styles.pnlRow}>
                <Text style={styles.splitText}>投入成本 {fmtBase(hero.cost)}</Text>
                <Text style={styles.splitDot}>·</Text>
                <Text style={styles.splitText}>未實現</Text>
                <Pnl value={hero.unrealized} display={fmtBaseAbs(hero.unrealized)} size={12} />
                <Pnl
                  value={hero.returnPct}
                  display={`${Math.abs(hero.returnPct).toFixed(2)}%`}
                  signMode="plusminus"
                  size={12}
                />
              </View>
            ) : null}

            {/* 降級揭露：部分缺報價/查無代號/含過期值 + 無法換算幣別現金 + 重試。 */}
            {(hero && (hero.pendingCount > 0 || hero.notFoundCount > 0 || hero.anyStale)) ||
            cashUnconverted.length > 0 ? (
              <View style={styles.staleRow}>
                <Text style={styles.staleText} numberOfLines={2}>
                  {[
                    hero && hero.pendingCount > 0 ? `${hero.pendingCount} 檔報價更新中` : null,
                    hero && hero.notFoundCount > 0 ? `${hero.notFoundCount} 檔查無代號` : null,
                    hero && hero.anyStale ? '部分為最後已知報價（延遲）' : null,
                    cashUnconverted.length > 0
                      ? `${cashUnconverted.join('、')} 現金未計入（匯率未就緒）`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="重試報價"
                  hitSlop={6}
                  onPress={retryQuotes}
                >
                  <Text style={styles.retry}>重試</Text>
                </Pressable>
              </View>
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
        {positions.length === 0 && skipped.length === 0 ? (
          <EmptyState
            icon={<PlusIcon size={26} color={colors.accent} />}
            title="此帳戶尚無持股"
            subtitle="到「交易」分頁為此帳戶記錄一筆買入"
          />
        ) : (
          <View style={styles.holdings}>
            {positions.map((p) => {
              // 每列右側＝市值 + 報酬%（原幣別；均價留 subtitle）；缺報價降級不以成本冒充。
              const v = positionValuation(p, quoteFor(quotes, p.market, p.symbol), Date.now());
              const notFound =
                quoteErrorFor(quoteErrors, p.market, p.symbol) === 'symbol_not_found';
              return (
                <ListItem
                  key={`${p.market}_${p.symbol}`}
                  title={p.symbol}
                  subtitle={`${shares(p.quantity, p.currency)} 股 · 均價 ${Money.fromDecimalString(p.averageCost, p.currency).toDisplayString()}`}
                  right={
                    v ? (
                      <View style={styles.holdingRight}>
                        <Text style={styles.holdingValue}>
                          {formatMoney(v.marketValue.toDecimalString(), p.currency)}
                        </Text>
                        <Pnl
                          value={v.returnPct}
                          display={`${Math.abs(v.returnPct).toFixed(2)}%`}
                          signMode="plusminus"
                          size={12}
                        />
                      </View>
                    ) : notFound ? (
                      <Text style={styles.holdingNotFound}>查無代號</Text>
                    ) : (
                      <Text style={styles.holdingPending}>更新中…</Text>
                    )
                  }
                />
              );
            })}
            {/* 逐-symbol 容錯：資料異常的標的標示為「資料異常」，不顯示錯誤數字、不 blank 整頁。 */}
            {skipped.map((s, i) => (
              <ListItem
                key={`skip_${s.market}_${s.symbol}`}
                title={s.symbol}
                subtitle="資料異常，已暫不計入"
                divider={i < skipped.length - 1}
                right={<Text style={styles.skippedTag}>資料異常</Text>}
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

/**
 * 帳戶現金合計換算進基礎幣別：各幣別餘額以 `toDisplay`（rates 優先、退 demo FX）換算後加總。
 * 無法換算的幣別（rates 未就緒且非 demo 支援對）跳過，回傳其幣別前綴清單供揭露（不靜默混算）。
 */
function cashInBase(
  cash: Partial<Record<Currency, string>>,
  rates: RateMap | null,
  base: Currency,
): { cash: Money; unconverted: string[] } {
  let sum = Money.zero(base);
  const unconverted: string[] = [];
  for (const [ccy, str] of Object.entries(cash)) {
    if (!str) continue;
    const c = ccy as Currency;
    const amount = Money.fromDecimalString(str, c);
    if (amount.isZero()) continue;
    const conv = toDisplay(amount, rates, base);
    if (conv === null) {
      unconverted.push(currencyPrefix(c).trim());
      continue;
    }
    sum = sum.add(conv);
  }
  return { cash: sum, unconverted };
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
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroNotFound: {
    fontFamily: fontFamily.text.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  staleText: {
    flex: 1,
    fontFamily: fontFamily.text.regular,
    fontSize: 11,
    color: colors.textWeak,
  },
  retry: { fontFamily: fontFamily.text.bold, fontSize: 11, color: colors.accent },

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
  holdingRight: { alignItems: 'flex-end', gap: 2 },
  holdingValue: {
    fontFamily: fontFamily.num.semibold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
    ...numericStyle,
  },
  holdingPending: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    color: colors.textFaint,
  },
  holdingNotFound: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.footnote,
    color: colors.danger,
  },
  skippedTag: {
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
