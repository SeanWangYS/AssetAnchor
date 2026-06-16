import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ACCOUNT_TYPES,
  BROKERS,
  MARKETS,
  accountInputSchema,
  type AccountInput,
  type AccountType,
  type Broker,
  type Market,
} from '@assetanchor/shared';
import { Button, ColorSwatches, Icon, Input, Segmented, Sheet } from '../../../core/ui';
import { colors, fontFamily, fontSize, radius, spacing } from '../../../core/theme';
import { accountTypeLabel, brokerLabel } from '../accountDisplay';

/** 基礎幣別（accountInputSchema 僅收 USD / TWD）。 */
type BaseCcy = 'TWD' | 'USD';
const CURRENCY_OPTIONS: readonly { value: BaseCcy; label: string }[] = [
  { value: 'TWD', label: 'TWD' },
  { value: 'USD', label: 'USD' },
];

/** 主要市場繁中標籤。 */
const MARKET_LABELS: Record<Market, string> = {
  TW: '台股',
  US: '美股',
  CRYPTO: '加密貨幣',
  OTHER: '其他',
};

type AccountFormInitial = Partial<{
  account_name: string;
  broker: string;
  account_type: string;
  base_currency: string;
  market: string;
  color: string;
  notes: string;
}>;

interface AccountFormProps {
  initial?: AccountFormInitial;
  submitLabel: string;
  onSubmit: (input: AccountInput) => void | Promise<void>;
}

export default function AccountForm({ initial, submitLabel, onSubmit }: AccountFormProps) {
  const [accountName, setAccountName] = useState(initial?.account_name ?? '');
  const [broker, setBroker] = useState(initial?.broker ?? '');
  const [accountType, setAccountType] = useState(initial?.account_type ?? '');
  const [baseCurrency, setBaseCurrency] = useState<BaseCcy>(
    initial?.base_currency === 'USD' ? 'USD' : 'TWD',
  );
  const [market, setMarket] = useState(initial?.market ?? '');
  const [color, setColor] = useState(initial?.color ?? colors.accent);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    const result = accountInputSchema.safeParse({
      account_name: accountName,
      broker,
      account_type: accountType,
      base_currency: baseCurrency,
      market,
      color,
      notes,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !(key in fieldErrors)) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(result.data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Input
        label="帳戶名稱"
        value={accountName}
        onChangeText={setAccountName}
        error={errors.account_name ?? null}
        placeholder="例：富邦複委託"
        autoCapitalize="none"
      />

      <PickerField
        label="券商"
        sheetTitle="選擇券商"
        value={broker}
        display={broker ? brokerLabel(broker as Broker) : ''}
        options={BROKERS.map((b) => ({ value: b, label: brokerLabel(b) }))}
        onSelect={setBroker}
        error={errors.broker ?? null}
      />

      <PickerField
        label="帳戶類型"
        sheetTitle="選擇帳戶類型"
        value={accountType}
        display={accountType ? accountTypeLabel(accountType as AccountType) : ''}
        options={ACCOUNT_TYPES.map((t) => ({ value: t, label: accountTypeLabel(t) }))}
        onSelect={setAccountType}
        error={errors.account_type ?? null}
      />

      <View style={styles.field}>
        <Text style={styles.label}>基礎幣別</Text>
        <Segmented options={CURRENCY_OPTIONS} value={baseCurrency} onChange={setBaseCurrency} />
        {errors.base_currency ? <Text style={styles.err}>{errors.base_currency}</Text> : null}
      </View>

      <PickerField
        label="主要市場"
        sheetTitle="選擇主要市場"
        value={market}
        display={market ? (MARKET_LABELS[market as Market] ?? market) : ''}
        options={MARKETS.map((m) => ({ value: m, label: MARKET_LABELS[m] }))}
        onSelect={setMarket}
        error={errors.market ?? null}
      />

      <View style={styles.field}>
        <Text style={styles.label}>識別色</Text>
        <ColorSwatches value={color} onChange={setColor} />
      </View>

      <Input
        label="備註"
        value={notes}
        onChangeText={setNotes}
        multiline
        error={errors.notes ?? null}
      />

      <View style={styles.submit}>
        <Button title={submitLabel} onPress={handleSubmit} loading={busy} disabled={busy} />
      </View>
    </View>
  );
}

interface PickerOption {
  value: string;
  label: string;
}

interface PickerFieldProps {
  label: string;
  sheetTitle: string;
  value: string;
  /** 顯示用繁中標籤（空字串 → 顯示佔位）。 */
  display: string;
  options: readonly PickerOption[];
  onSelect: (value: string) => void;
  error?: string | null;
}

/** 表單內聯選單（feature 本地 picker，沿用 core/ui Sheet）。 */
function PickerField({
  label,
  sheetTitle,
  value,
  display,
  options,
  onSelect,
  error,
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.select, error ? styles.selectError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={display ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
          {display || '請選擇'}
        </Text>
        <Icon name="chevron" size={18} color={colors.textWeak} />
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Sheet visible={open} title={sheetTitle} onClose={() => setOpen(false)}>
        {options.map((opt) => {
          const on = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={styles.option}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, on ? styles.optionTextOn : null]}>{opt.label}</Text>
              {on ? <Icon name="check" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  submit: { marginTop: spacing.sm },
  label: {
    fontFamily: fontFamily.text.bold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 1,
  },
  selectError: { borderColor: colors.down },
  selectText: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textPrimary,
    flex: 1,
  },
  selectPlaceholder: {
    fontFamily: fontFamily.text.regular,
    fontSize: fontSize.text,
    color: colors.textFaint,
    flex: 1,
  },
  err: { fontFamily: fontFamily.text.medium, fontSize: fontSize.label, color: colors.down },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionText: {
    fontFamily: fontFamily.text.medium,
    fontSize: fontSize.text,
    color: colors.textSecondary,
  },
  optionTextOn: { fontFamily: fontFamily.text.bold, color: colors.textPrimary },
});
