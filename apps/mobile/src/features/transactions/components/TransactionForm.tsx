import { useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ASSET_TYPES,
  MARKETS,
  Money,
  defaultCurrencyForMarket,
  sellableQuantityForAccount,
  symbolLooksLikeMarketMismatch,
  transactionInputSchema,
  type AccountDocument,
  type Currency,
  type Market,
  type TransactionDocument,
  type TransactionInput,
} from '@assetanchor/shared';
import { Button, Card, Icon, Input, Sheet } from '../../../core/ui';
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
import { currencySymbol, formatMoney } from '../transactionsView';

const MVP_CURRENCIES = ['TWD', 'USD', 'USDT'] as const;
const ASSET_TYPE_LABEL: Record<string, string> = {
  STOCK: '個股',
  ETF: 'ETF',
  CRYPTO: '加密貨幣',
  BOND: '債券',
  MUTUAL_FUND: '基金',
  OTHER: '其他',
};
const MARKET_LABEL: Record<string, string> = {
  TW: '台股',
  US: '美股',
  CRYPTO: '加密貨幣',
  OTHER: '其他',
};

/** 表單欄位皆為字串（select 初值為空字串）；驗證與型別轉換交給 zodResolver。 */
interface TransactionFormValues {
  account_id: string;
  symbol: string;
  market: string;
  asset_type: string;
  transaction_type: string;
  transaction_date: string;
  currency: string;
  quantity: string;
  price: string;
  fee: string;
  tax: string;
  notes: string;
}

export type TransactionFormDefaults = Partial<TransactionFormValues>;

interface TransactionFormProps {
  accounts: AccountDocument[];
  /** 使用者交易（推導「可賣股數」做 SELL 超賣驗證；編輯時應排除被編輯的該筆）。 */
  transactions: TransactionDocument[];
  /** 編輯時帶入原值（screens 由 TransactionDocument 映射）。 */
  initialValues?: TransactionFormDefaults;
  submitLabel: string;
  onSubmit: (input: TransactionInput) => void | Promise<void>;
}

/** 去尾零的股數顯示（"2500.0000000000" → "2500"）。 */
function trimShares(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** 代號自動補完候選：由歷史交易推導的去重 (market, symbol)。 */
interface SymbolSuggestion {
  symbol: string;
  market: string;
  asset_type: string;
  currency: string;
}

/**
 * 由歷史交易推導去重的 (market, symbol) 候選；每個候選的 asset_type / currency
 * 取「該代號最近一筆交易」之值（transactions 不保證已排序，以 transaction_date 最大者為準）。
 * 純函式。
 */
function deriveSymbolSuggestions(transactions: TransactionDocument[]): SymbolSuggestion[] {
  const latest = new Map<string, TransactionDocument>();
  for (const t of transactions) {
    if (!t.symbol) continue;
    const key = `${t.market}::${t.symbol}`;
    const prev = latest.get(key);
    if (!prev || t.transaction_date > prev.transaction_date) {
      latest.set(key, t);
    }
  }
  return Array.from(latest.values()).map((t) => ({
    symbol: t.symbol,
    market: t.market,
    asset_type: t.asset_type,
    currency: t.currency,
  }));
}

/** YYYY-MM-DD（本機今天），交易日預設值。 */
function today(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export default function TransactionForm({
  accounts,
  transactions,
  initialValues,
  submitLabel,
  onSubmit,
}: TransactionFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionInputSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      account_id: initialValues?.account_id ?? accounts[0]?.account_id ?? '',
      symbol: initialValues?.symbol ?? '',
      market: initialValues?.market ?? accounts[0]?.market ?? '',
      asset_type: initialValues?.asset_type ?? '',
      transaction_type: initialValues?.transaction_type ?? 'BUY',
      transaction_date: initialValues?.transaction_date ?? today(),
      currency: initialValues?.currency ?? accounts[0]?.base_currency ?? '',
      quantity: initialValues?.quantity ?? '',
      price: initialValues?.price ?? '',
      fee: initialValues?.fee ?? '0',
      tax: initialValues?.tax ?? '0',
      notes: initialValues?.notes ?? '',
    },
  });

  // 即時計算預覽（單幣別 ADR-0005：total = 股數×單價 ± 手續費，不做 FX 換算）。
  const txType = watch('transaction_type');
  const qty = watch('quantity');
  const price = watch('price');
  const fee = watch('fee');
  const market = watch('market');
  const symbolRaw = watch('symbol');
  const accountId = watch('account_id');
  const currency = (watch('currency') || 'TWD') as Currency;
  const isBuy = txType !== 'SELL';

  const previewTotal = useMemo(
    () => computeTotal(qty, price, fee, currency, isBuy),
    [qty, price, fee, currency, isBuy],
  );

  // 市場 → 幣別單向聯動（guard-transaction-market-consistency）：使用者改市場時自動帶對應預設
  // （TW→TWD、US→USD、CRYPTO→USD 預設可改 USDT/TWD、OTHER 不動；enable-crypto-quotes D5）。
  // 僅在「變動」時同步一次（跳過 mount，避免編輯既有不一致資料時被反向自動改掉——
  // 修正方向應由使用者選市場決定）。
  const prevMarketRef = useRef(market);
  useEffect(() => {
    if (market === prevMarketRef.current) return;
    prevMarketRef.current = market;
    if (!(MARKETS as readonly string[]).includes(market)) return;
    const preset = defaultCurrencyForMarket(market as Market);
    if (preset) setValue('currency', preset, { shouldValidate: true });
  }, [market, setValue]);

  // 代號樣式 vs 市場的軟警告（非阻擋；啟發式有誤報可能，故僅提示「請確認」）。
  const marketMismatchHint = useMemo(() => {
    if (!(MARKETS as readonly string[]).includes(market)) return null;
    if (!symbolLooksLikeMarketMismatch(market as Market, symbolRaw)) return null;
    return market === 'US'
      ? '代號看起來像台股代號，請確認市場選擇'
      : '代號看起來像美股代號，請確認市場選擇';
  }, [market, symbolRaw]);

  // 代號自動補完：由歷史交易去重推導候選，以目前輸入做前綴比對（最多 5 筆）。
  const symbolSuggestionsAll = useMemo(() => deriveSymbolSuggestions(transactions), [transactions]);
  const symbolQuery = symbolRaw.trim();
  const symbolSuggestions = useMemo(() => {
    if (!symbolQuery) return [];
    const upper = symbolQuery.toUpperCase();
    // 已精確命中某候選代號時不再顯示（避免選取後殘留下拉）。
    if (symbolSuggestionsAll.some((s) => s.symbol.toUpperCase() === upper)) return [];
    return symbolSuggestionsAll.filter((s) => s.symbol.toUpperCase().startsWith(upper)).slice(0, 5);
  }, [symbolSuggestionsAll, symbolQuery]);

  // SELL 不可超賣：可賣股數＝**所選帳戶**之 (market, symbol, currency) 衍生持倉（帳戶層級，
  // shared 單一事實來源；D7：SELL 只沖銷同幣別 lot，幣別選錯可賣即為 0）。
  // 只能賣該帳戶實際持有的股；同 symbol 於他帳戶的持倉不計入。切帳戶/幣別即重算。
  const sellable = useMemo(() => {
    if (isBuy || !accountId || !market || !symbolRaw.trim()) return null;
    return sellableQuantityForAccount(
      transactions,
      accountId,
      market as Market,
      symbolRaw.trim().toUpperCase(),
      currency,
    );
  }, [isBuy, accountId, market, symbolRaw, transactions, currency]);
  const noHolding = sellable !== null && new Money(sellable, currency).isZero();
  const oversell = useMemo(() => {
    if (sellable === null) return false;
    const q = safeMoney(qty, currency);
    return q !== null && q.compareTo(new Money(sellable, currency)) > 0;
  }, [sellable, qty, currency]);

  // resolver 已驗證；SELL 額外 gate「不可超賣 / 須有持倉」，過了再 parse 取型別化 input。
  const submit = handleSubmit((values) => {
    if (!isBuy && (noHolding || oversell)) return;
    return onSubmit(transactionInputSchema.parse(values));
  });

  const accountOptions = accounts.map((a) => ({ value: a.account_id, label: a.account_name }));

  return (
    <View style={styles.form}>
      {/* 買 / 賣 漸層分段頭（transactions-page-spec T2；非 core Segmented：用買賣專屬漸層） */}
      <Controller
        control={control}
        name="transaction_type"
        render={({ field }) => (
          <View>
            <BuySellToggle value={field.value} onChange={field.onChange} />
            {/* SELL：顯示可賣股數；無持倉 / 超賣以紅字提示並擋送出（不可超賣）。 */}
            {!isBuy && sellable !== null ? (
              <Text style={noHolding || oversell ? styles.fieldErr : styles.sellHint}>
                {noHolding
                  ? '此帳戶目前無此標的持倉可賣'
                  : oversell
                    ? `賣出股數超過可賣（${trimShares(sellable)} 股）`
                    : `可賣 ${trimShares(sellable)} 股`}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="symbol"
        render={({ field, fieldState }) => (
          <View>
            <Input
              testID="tx-symbol"
              label="股票代號"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="輸入或搜尋（例：2330, AAPL）"
              autoCapitalize="characters"
              error={fieldState.error?.message ?? null}
            />
            {/* 代號樣式 vs 市場軟警告（非阻擋）：US×數字代號 / TW×純字母代號時提示。 */}
            {marketMismatchHint ? (
              <Text style={styles.marketMismatchHint}>{marketMismatchHint}</Text>
            ) : null}
            {symbolSuggestions.length > 0 ? (
              <View style={styles.suggestList}>
                {symbolSuggestions.map((s) => (
                  <Pressable
                    key={`${s.market}::${s.symbol}`}
                    accessibilityRole="button"
                    style={styles.suggestRow}
                    onPress={() => {
                      setValue('symbol', s.symbol, { shouldValidate: true });
                      setValue('market', s.market, { shouldValidate: true });
                      setValue('asset_type', s.asset_type, { shouldValidate: true });
                      setValue('currency', s.currency, { shouldValidate: true });
                    }}
                  >
                    <Text style={styles.suggestSymbol}>{s.symbol}</Text>
                    <Text style={styles.suggestMarket}>{MARKET_LABEL[s.market] ?? s.market}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="account_id"
        render={({ field, fieldState }) => (
          <PickerField
            testID="tx-account"
            label="帳戶"
            value={field.value}
            options={accountOptions}
            onSelect={field.onChange}
            error={fieldState.error?.message ?? null}
          />
        )}
      />

      <View style={styles.twoCol}>
        <Controller
          control={control}
          name="market"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <PickerField
                testID="tx-market"
                label="市場"
                value={field.value}
                options={MARKETS.map((m) => ({ value: m, label: MARKET_LABEL[m] ?? m }))}
                onSelect={field.onChange}
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="asset_type"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <PickerField
                testID="tx-asset-type"
                label="資產類型"
                value={field.value}
                options={ASSET_TYPES.map((a) => ({ value: a, label: ASSET_TYPE_LABEL[a] ?? a }))}
                onSelect={field.onChange}
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
      </View>

      <View style={styles.twoCol}>
        <Controller
          control={control}
          name="transaction_date"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <DateField
                label="交易日期"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="currency"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <PickerField
                testID="tx-currency"
                label="幣別"
                value={field.value}
                options={MVP_CURRENCIES.map((c) => ({ value: c, label: c }))}
                onSelect={field.onChange}
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
      </View>

      <View style={styles.twoCol}>
        <Controller
          control={control}
          name="quantity"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <Input
                testID="tx-quantity"
                label="股數"
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
        <Controller
          control={control}
          name="price"
          render={({ field, fieldState }) => (
            <View style={styles.col}>
              <Input
                testID="tx-price"
                label={`單價（${currencySymbol(currency)}）`}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="decimal-pad"
                error={fieldState.error?.message ?? null}
              />
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="fee"
        render={({ field, fieldState }) => (
          <Input
            label={`手續費（${currencySymbol(currency)}）`}
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            error={fieldState.error?.message ?? null}
          />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <Input
            label="備註"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="選填"
            multiline
            error={fieldState.error?.message ?? null}
          />
        )}
      />

      {/* 即時計算預覽卡（強調卡 glow；單幣別、無 FX 換算行）。 */}
      <Card glow padding={spacing.cardInnerLg} style={styles.preview}>
        <Text style={styles.previewLabel}>{isBuy ? '預估總成本' : '預估總收入'}</Text>
        <Text style={styles.previewValue}>{formatMoney(previewTotal, currency)}</Text>
        <Text style={styles.previewNote}>股數 × 單價 {isBuy ? '＋' : '−'} 手續費（原幣別）</Text>
      </Card>

      <Button testID="tx-submit" title={submitLabel} onPress={submit} loading={isSubmitting} />
    </View>
  );
}

/**
 * 計算預估總額（10 位小數 canonical string）。total = qty×price ± fee。
 * 任一欄位無效（空 / NaN）時以 0 計，預覽顯示為 0（不丟例外，UX 友善）。
 */
function computeTotal(
  qty: string,
  price: string,
  fee: string,
  currency: Currency,
  isBuy: boolean,
): string {
  const q = safeMoney(qty, currency);
  const p = safeMoney(price, currency);
  const f = safeMoney(fee, currency);
  if (!q || !p) return Money.zero(currency).toDecimalString();
  // 以原始字串相乘，保留完整 decimal 精度（不經 toNumber 逃生門）。
  const gross = p.multiply(qty.trim());
  const feeM = f ?? Money.zero(currency);
  const total = isBuy ? gross.add(feeM) : gross.subtract(feeM);
  return total.toDecimalString();
}

function safeMoney(raw: string, currency: Currency): Money | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new Money(trimmed, currency);
  } catch {
    return null;
  }
}

interface BuySellToggleProps {
  value: string;
  onChange: (value: string) => void;
}

/** 買/賣專屬漸層分段（買 紫→洋紅、賣 藍→青；135deg）。core Segmented 用 accent，故此處自繪。 */
function BuySellToggle({ value, onChange }: BuySellToggleProps) {
  const options: { key: 'BUY' | 'SELL'; label: string; grad: readonly [string, string] }[] = [
    { key: 'BUY', label: '買入', grad: gradients.buy },
    { key: 'SELL', label: '賣出', grad: gradients.sell },
  ];
  return (
    <View style={styles.toggleTrack}>
      {options.map((o) => {
        const on = o.key === value;
        if (on) {
          return (
            <LinearGradient
              key={o.key}
              colors={o.grad}
              start={gradientDirection.diagonal135.start}
              end={gradientDirection.diagonal135.end}
              style={styles.toggleOn}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
                onPress={() => onChange(o.key)}
                style={styles.togglePress}
              >
                <Text style={[styles.toggleLabel, styles.toggleLabelOn]}>{o.label}</Text>
              </Pressable>
            </LinearGradient>
          );
        }
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            onPress={() => onChange(o.key)}
            style={styles.toggleOff}
          >
            <Text style={styles.toggleLabel}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface Option {
  value: string;
  label: string;
}

interface PickerFieldProps {
  label: string;
  value: string;
  options: readonly Option[];
  onSelect: (value: string) => void;
  error?: string | null;
  /** E2E 選擇器：多個 picker 佔位「請選擇」相同，需 testID 才能點對欄位開對的 sheet。 */
  testID?: string;
}

/** 選擇欄（點開底部 Sheet 選項清單）。對齊 prototype `Field` + chevron。 */
function PickerField({ label, value, options, onSelect, error, testID }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const display = options.find((o) => o.value === value)?.label ?? '';
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.control, error ? styles.controlError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={display ? styles.controlText : styles.controlPlaceholder} numberOfLines={1}>
          {display || '請選擇'}
        </Text>
        <Icon name="chevron" size={16} color={colors.textFaint} />
      </Pressable>
      {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={styles.option}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, selected ? styles.optionTextOn : null]}>
                {opt.label}
              </Text>
              {selected ? <Icon name="check" size={18} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

/**
 * 日期欄（inline，feature-local）。
 *
 * 設計包待辦仍列「自訂起訖的日期選擇器」未定稿；本 WP 不引第三方 picker，採
 * 受控文字輸入（YYYY-MM-DD）＋日曆 icon 提示，沿用既有 zod `isRealDate` 驗證。
 * 待平台原生 DatePicker 導入後替換（見回報 flag）。
 */
function DateField({ label, value, onChange, error }: DateFieldProps) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChange}
      placeholder={Platform.OS === 'ios' ? 'YYYY-MM-DD' : '2026-06-15'}
      autoCapitalize="none"
      keyboardType="numbers-and-punctuation"
      error={error ?? null}
      style={numericStyle}
      rightSlot={<Icon name="calendar" size={16} color={colors.textFaint} />}
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, minWidth: 0 },

  // —— 買/賣 toggle ——
  toggleTrack: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
  },
  toggleOn: {
    flex: 1,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  togglePress: { paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  toggleOff: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  toggleLabel: {
    fontFamily: fontFamily.text.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleLabelOn: { fontFamily: fontFamily.text.extrabold, color: colors.onPrimary },

  // —— 欄位 ——
  field: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  controlError: { borderColor: colors.down },
  controlText: {
    flex: 1,
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  controlPlaceholder: {
    flex: 1,
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textFaint,
  },
  fieldErr: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.down,
  },
  sellHint: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.textWeak,
    marginTop: spacing.xs,
  },
  // 市場/代號樣式軟警告：非錯誤（不擋送出），用 accent 區別於 down 紅。
  marketMismatchHint: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.label,
    color: colors.accent,
    marginTop: spacing.xs,
  },

  // —— 代號自動補完（inline 下拉，靜態樣式，無焦點切換陰影） ——
  suggestList: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  suggestSymbol: {
    fontFamily: fontFamily.text.semibold,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  suggestMarket: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.label,
    color: colors.textWeak,
  },

  // —— Sheet 選項 ——
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionText: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
  },
  optionTextOn: { fontFamily: fontFamily.text.bold, color: colors.accent },

  // —— 預覽卡 ——
  preview: { borderColor: `${colors.accent}55` },
  previewLabel: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  previewValue: {
    fontFamily: fontFamily.num.extrabold,
    fontSize: fontSize.cardTitle,
    color: colors.textPrimary,
    marginTop: 2,
    ...numericStyle,
  },
  previewNote: {
    fontFamily: fontFamily.text.regular,
    fontSize: 11,
    color: colors.textWeak,
    marginTop: 3,
  },
});
