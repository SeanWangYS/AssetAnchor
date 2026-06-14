import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ASSET_TYPES,
  MARKETS,
  transactionInputSchema,
  type AccountDocument,
  type TransactionInput,
} from '@assetanchor/shared';
import { Button, Input, Sheet } from '../../../core/ui';
import { colors, fontSize, radius, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

const MVP_CURRENCIES = ['USD', 'TWD'] as const;
const F = zhTW.transactions.fields;

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

interface TransactionFormProps {
  accounts: AccountDocument[];
  defaultAccountId?: string | undefined;
  submitLabel: string;
  onSubmit: (input: TransactionInput) => void | Promise<void>;
}

export default function TransactionForm({
  accounts,
  defaultAccountId,
  submitLabel,
  onSubmit,
}: TransactionFormProps) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TransactionFormValues>({
    // 同一份 transactionInputSchema 直接當驗證器（RHF + zodResolver）。
    resolver: zodResolver(transactionInputSchema) as unknown as Resolver<TransactionFormValues>,
    defaultValues: {
      account_id: defaultAccountId ?? '',
      symbol: '',
      market: '',
      asset_type: '',
      transaction_type: 'BUY',
      transaction_date: '',
      currency: '',
      quantity: '',
      price: '',
      fee: '0',
      tax: '0',
      notes: '',
    },
  });

  // resolver 已驗證；再 parse 一次取得型別化（且 symbol 已大寫、預設值已套用）的 TransactionInput。
  const submit = handleSubmit((values) => onSubmit(transactionInputSchema.parse(values)));

  const accountOptions = accounts.map((a) => ({ value: a.account_id, label: a.account_name }));
  const enumOptions = (vals: readonly string[]) => vals.map((v) => ({ value: v, label: v }));

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="account_id"
        render={({ field, fieldState }) => (
          <SelectField
            label={F.account_id}
            value={field.value}
            options={accountOptions}
            onSelect={field.onChange}
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="symbol"
        render={({ field, fieldState }) => (
          <Input
            label={F.symbol}
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="characters"
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="market"
        render={({ field, fieldState }) => (
          <SelectField
            label={F.market}
            value={field.value}
            options={enumOptions(MARKETS)}
            onSelect={field.onChange}
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="asset_type"
        render={({ field, fieldState }) => (
          <SelectField
            label={F.asset_type}
            value={field.value}
            options={enumOptions(ASSET_TYPES)}
            onSelect={field.onChange}
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="currency"
        render={({ field, fieldState }) => (
          <SelectField
            label={F.currency}
            value={field.value}
            options={enumOptions(MVP_CURRENCIES)}
            onSelect={field.onChange}
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="transaction_date"
        render={({ field, fieldState }) => (
          <Input
            label={F.transaction_date}
            value={field.value}
            onChangeText={field.onChange}
            placeholder="2024-01-15"
            autoCapitalize="none"
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="quantity"
        render={({ field, fieldState }) => (
          <Input
            label={F.quantity}
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="price"
        render={({ field, fieldState }) => (
          <Input
            label={F.price}
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="fee"
        render={({ field, fieldState }) => (
          <Input
            label={F.fee}
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="decimal-pad"
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Controller
        control={control}
        name="tax"
        render={({ field, fieldState }) => (
          <Input
            label={F.tax}
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
            label={F.notes}
            value={field.value}
            onChangeText={field.onChange}
            multiline
            error={fieldState.error?.message ?? null}
          />
        )}
      />
      <Button title={submitLabel} onPress={submit} disabled={isSubmitting} />
    </View>
  );
}

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly Option[];
  onSelect: (value: string) => void;
  error?: string | null;
}

function SelectField({ label, value, options, onSelect, error }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const display = options.find((o) => o.value === value)?.label ?? '';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.select, error ? styles.selectError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={display ? styles.selectText : styles.selectPlaceholder}>
          {display || zhTW.transactions.actions.select}
        </Text>
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            style={styles.option}
            onPress={() => {
              onSelect(opt.value);
              setOpen(false);
            }}
          >
            <Text style={styles.optionText}>{opt.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.caption, color: colors.textMuted },
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  selectError: { borderColor: colors.danger },
  selectText: { fontSize: fontSize.body, color: colors.text },
  selectPlaceholder: { fontSize: fontSize.body, color: colors.textMuted },
  err: { fontSize: fontSize.caption, color: colors.danger },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: fontSize.body, color: colors.text },
});
