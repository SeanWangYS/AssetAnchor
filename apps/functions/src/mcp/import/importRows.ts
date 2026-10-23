import {
  Money,
  buildTransactionDoc,
  defaultCurrencyForMarket,
  findDuplicates,
  findImportOversells,
  transactionInputSchema,
  type ImportRow,
  type Market,
  type TransactionDocument,
  type TransactionInput,
} from '@assetanchor/shared';

/** One row as Claude reads it off a screenshot; numbers stay strings to avoid float drift. */
export interface ImportRowInput {
  transaction_date: string;
  symbol: string;
  market: string;
  transaction_type: string;
  quantity: string;
  price: string;
  asset_type?: string | undefined;
  currency?: string | undefined;
  fee?: string | undefined;
  tax?: string | undefined;
  notes?: string | undefined;
  keep_duplicate?: boolean | undefined;
}

/** Normalized row shown back to the user and bound into the confirmation token. */
export interface NormalizedRow {
  transaction_date: string;
  symbol: string;
  market: TransactionDocument['market'];
  asset_type: TransactionDocument['asset_type'];
  transaction_type: TransactionDocument['transaction_type'];
  currency: TransactionDocument['currency'];
  quantity: string;
  price: string;
  fee: string;
  tax: string;
  notes: string;
  keep_duplicate: boolean;
}

export type NormalizeResult =
  | { ok: true; row: NormalizedRow; input: TransactionInput }
  | { ok: false; error: string };

export const symbolIdOf = (market: string, symbol: string) => `${market}_${symbol}`;

/** Builds the app's TransactionInput from a row and validates it with the app form schema. */
export function normalizeImportRow(raw: ImportRowInput, accountId: string): NormalizeResult {
  if (raw.transaction_type !== 'BUY' && raw.transaction_type !== 'SELL') {
    return { ok: false, error: '目前只支援買入（BUY）與賣出（SELL）' };
  }
  const parsed = transactionInputSchema.safeParse({
    account_id: accountId,
    symbol: raw.symbol,
    market: raw.market,
    asset_type: raw.asset_type ?? 'STOCK',
    transaction_type: raw.transaction_type,
    transaction_date: raw.transaction_date.trim(),
    currency: raw.currency ?? defaultCurrencyForMarket(raw.market as Market) ?? '',
    quantity: raw.quantity,
    price: raw.price,
    fee: raw.fee ?? '0',
    tax: raw.tax ?? '0',
    notes: raw.notes ?? '',
  });
  if (!parsed.success) {
    const messages = [...new Set(parsed.error.issues.map((i) => i.message))];
    return { ok: false, error: messages.join('；') };
  }
  const doc = buildTransactionDoc(parsed.data, { transactionId: 'preview' });
  return {
    ok: true,
    input: parsed.data,
    row: {
      transaction_date: doc.transaction_date,
      symbol: doc.symbol,
      market: doc.market,
      asset_type: doc.asset_type,
      transaction_type: doc.transaction_type,
      currency: doc.currency,
      quantity: doc.quantity,
      price: doc.price,
      fee: doc.fee,
      tax: doc.tax,
      notes: doc.notes,
      keep_duplicate: raw.keep_duplicate ?? false,
    },
  };
}

/** `exists` in symbols · `new` confirmed by the quote source · `missing` not found anywhere. */
export type SymbolStatus = 'exists' | 'new' | 'missing';

export interface RowReport {
  index: number;
  status: 'ok' | 'duplicate' | 'invalid' | 'oversell';
  message: string | null;
  /** Matches an existing or earlier row (kept only when keep_duplicate is set). */
  duplicate: boolean;
  /** The symbol will be created in AssetAnchor on import. */
  new_symbol: boolean;
  row: NormalizedRow | null;
}

const toImportRow = (row: NormalizedRow, accountId: string): ImportRow => ({
  ...row,
  account_id: accountId,
});

const plain = (v: string, currency: NormalizedRow['currency']) =>
  new Money(v, currency).toDisplayString(10).replace(/\.?0+$/, '');

/**
 * Per-row verdict for a batch (spec mcp-server validate_transactions). Precedence:
 * invalid > oversell > duplicate. Rows that will be skipped (invalid, or duplicate not kept)
 * do not count toward the oversell replay.
 */
export function assessImport(args: {
  rows: NormalizeResult[];
  existing: readonly TransactionDocument[];
  symbols: ReadonlyMap<string, SymbolStatus>;
  accountId?: string;
}): RowReport[] {
  const accountId = args.accountId ?? args.rows.find((r) => r.ok)?.input.account_id ?? '';
  const reports: RowReport[] = args.rows.map((r, index) => {
    if (!r.ok) {
      return {
        index,
        status: 'invalid',
        message: r.error,
        duplicate: false,
        new_symbol: false,
        row: null,
      };
    }
    const status = args.symbols.get(symbolIdOf(r.row.market, r.row.symbol));
    if (status === 'missing') {
      return {
        index,
        status: 'invalid',
        message: '找不到此代號，請確認代號與市場（若確定正確，請稍後再試）',
        duplicate: false,
        new_symbol: false,
        row: r.row,
      };
    }
    return {
      index,
      status: 'ok',
      message: null,
      duplicate: false,
      new_symbol: status === 'new',
      row: r.row,
    };
  });

  const valid = reports.filter((r) => r.status === 'ok' && r.row);
  const dupIdx = new Set(
    findDuplicates(
      args.existing,
      valid.map((r) => toImportRow(r.row as NormalizedRow, accountId)),
    ).map((i) => valid[i]?.index),
  );
  for (const r of valid) {
    if (!dupIdx.has(r.index)) continue;
    r.duplicate = true;
    if (!r.row?.keep_duplicate) {
      r.status = 'duplicate';
      r.message = '與既有交易或本批前面的列重複';
    }
  }

  const importing = reports.filter((r) => r.status === 'ok' && r.row);
  for (const o of findImportOversells(
    args.existing,
    importing.map((r) => toImportRow(r.row as NormalizedRow, accountId)),
  )) {
    const r = importing[o.index];
    if (!r?.row) continue;
    r.status = 'oversell';
    r.message = `超賣：此帳戶當時可賣 ${plain(o.sellable, r.row.currency)}，欲賣 ${plain(o.requested, r.row.currency)}`;
  }
  return reports;
}
