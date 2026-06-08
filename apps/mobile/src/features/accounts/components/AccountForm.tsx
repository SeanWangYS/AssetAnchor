import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ACCOUNT_TYPES,
  BROKERS,
  MARKETS,
  accountInputSchema,
  type AccountInput,
} from '@assetanchor/shared';
import { Button, Input, Sheet } from '../../../core/ui';
import { ACCOUNT_COLORS, colors, fontSize, radius, spacing } from '../../../core/theme';
import { zhTW } from '../../../i18n/zh-TW';

const MVP_CURRENCIES = ['USD', 'TWD'] as const;
const F = zhTW.accounts.fields;

type AccountFormInitial = Partial<Record<keyof typeof F, string>>;

interface AccountFormProps {
  initial?: AccountFormInitial;
  submitLabel: string;
  onSubmit: (input: AccountInput) => void | Promise<void>;
}

export default function AccountForm({ initial, submitLabel, onSubmit }: AccountFormProps) {
  const [accountName, setAccountName] = useState(initial?.account_name ?? '');
  const [broker, setBroker] = useState(initial?.broker ?? '');
  const [accountType, setAccountType] = useState(initial?.account_type ?? '');
  const [baseCurrency, setBaseCurrency] = useState(initial?.base_currency ?? '');
  const [market, setMarket] = useState(initial?.market ?? '');
  const [color, setColor] = useState(initial?.color ?? ACCOUNT_COLORS[0]);
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
        label={F.account_name}
        value={accountName}
        onChangeText={setAccountName}
        error={errors.account_name ?? null}
        autoCapitalize="none"
      />
      <SelectField
        label={F.broker}
        value={broker}
        options={BROKERS}
        onSelect={setBroker}
        error={errors.broker ?? null}
      />
      <SelectField
        label={F.account_type}
        value={accountType}
        options={ACCOUNT_TYPES}
        onSelect={setAccountType}
        error={errors.account_type ?? null}
      />
      <SelectField
        label={F.base_currency}
        value={baseCurrency}
        options={MVP_CURRENCIES}
        onSelect={setBaseCurrency}
        error={errors.base_currency ?? null}
      />
      <SelectField
        label={F.market}
        value={market}
        options={MARKETS}
        onSelect={setMarket}
        error={errors.market ?? null}
      />
      <View style={styles.field}>
        <Text style={styles.label}>{F.color}</Text>
        <View style={styles.swatches}>
          {ACCOUNT_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c ? styles.swatchSelected : null,
              ]}
            />
          ))}
        </View>
      </View>
      <Input
        label={F.notes}
        value={notes}
        onChangeText={setNotes}
        multiline
        error={errors.notes ?? null}
      />
      <Button title={submitLabel} onPress={handleSubmit} disabled={busy} />
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  error?: string | null;
}

function SelectField({ label, value, options, onSelect, error }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.select, error ? styles.selectError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={value ? styles.selectText : styles.selectPlaceholder}>
          {value || zhTW.accounts.actions.select}
        </Text>
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            accessibilityRole="button"
            style={styles.option}
            onPress={() => {
              onSelect(opt);
              setOpen(false);
            }}
          >
            <Text style={styles.optionText}>{opt}</Text>
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
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.text },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: fontSize.body, color: colors.text },
});
