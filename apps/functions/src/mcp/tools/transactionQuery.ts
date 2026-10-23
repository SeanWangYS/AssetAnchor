import { isRealDate, type TransactionDocument } from '@assetanchor/shared';

/** The transaction fields an MCP client sees; amounts stay Money decimal strings (ADR-0005). */
export type TxRow = Pick<
  TransactionDocument,
  | 'transaction_id'
  | 'account_id'
  | 'transaction_date'
  | 'symbol'
  | 'market'
  | 'asset_type'
  | 'transaction_type'
  | 'currency'
  | 'quantity'
  | 'price'
  | 'fee'
  | 'tax'
  | 'notes'
> & { import_batch_id: string | null };

export interface TxFilter {
  account_id?: string;
  symbol?: string;
  market?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  cursor?: string;
  import_batch_id?: string;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

interface Cursor {
  d: string;
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeCursor(s: string): Cursor | null {
  try {
    const v = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as Partial<Cursor>;
    return typeof v.d === 'string' && typeof v.id === 'string' ? { d: v.d, id: v.id } : null;
  } catch {
    return null;
  }
}

/** Returns a 繁中 error for an invalid filter, or null when it is usable. */
export function validateFilter(f: TxFilter): string | null {
  for (const d of [f.date_from, f.date_to]) {
    if (d !== undefined && !isRealDate(d)) return '日期需為 YYYY-MM-DD';
  }
  if (f.date_from && f.date_to && f.date_from > f.date_to) return '起始日期不可晚於結束日期';
  if (f.cursor !== undefined && decodeCursor(f.cursor) === null) {
    return '分頁游標無效，請從第一頁重新查詢';
  }
  return null;
}

/** Newest first; equal dates order by id descending so pages never overlap. */
function newerFirst(a: TxRow, b: TxRow): number {
  if (a.transaction_date !== b.transaction_date) {
    return a.transaction_date < b.transaction_date ? 1 : -1;
  }
  return a.transaction_id < b.transaction_id ? 1 : a.transaction_id > b.transaction_id ? -1 : 0;
}

/** True when `row` sorts strictly after the cursor position. */
function isAfter(row: TxRow, c: Cursor): boolean {
  return newerFirst(row, { transaction_date: c.d, transaction_id: c.id } as TxRow) > 0;
}

export function toTxRow(t: TransactionDocument): TxRow {
  return {
    transaction_id: t.transaction_id,
    account_id: t.account_id,
    transaction_date: t.transaction_date,
    symbol: t.symbol,
    market: t.market,
    asset_type: t.asset_type,
    transaction_type: t.transaction_type,
    currency: t.currency,
    quantity: t.quantity,
    price: t.price,
    fee: t.fee,
    tax: t.tax,
    notes: t.notes,
    import_batch_id: t.import_batch_id ?? null,
  };
}

/** Filters, sorts and pages in memory (design D6: a user's history is small). Assumes a valid filter. */
export function queryTransactions(
  rows: TxRow[],
  f: TxFilter,
): { items: TxRow[]; next_cursor: string | null } {
  const symbol = f.symbol?.trim().toUpperCase();
  const limit = Math.min(Math.max(1, f.limit ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const cursor = f.cursor ? decodeCursor(f.cursor) : null;

  const matched = rows
    .filter(
      (r) =>
        (!f.account_id || r.account_id === f.account_id) &&
        (!f.import_batch_id || r.import_batch_id === f.import_batch_id) &&
        (!symbol || r.symbol.toUpperCase() === symbol) &&
        (!f.market || r.market === f.market) &&
        (!f.date_from || r.transaction_date >= f.date_from) &&
        (!f.date_to || r.transaction_date <= f.date_to),
    )
    .sort(newerFirst)
    .filter((r) => !cursor || isAfter(r, cursor));

  const items = matched.slice(0, limit);
  const last = items[items.length - 1];
  const next_cursor =
    matched.length > limit && last
      ? encodeCursor({ d: last.transaction_date, id: last.transaction_id })
      : null;
  return { items, next_cursor };
}
