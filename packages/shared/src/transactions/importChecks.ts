import { Money } from '../money/index.js';
import { sortTransactionsChronologically } from '../portfolio/deriveHoldings.js';
import type { TransactionDocument } from '../types/transaction.js';

/** The fields import checks need from a stored or proposed transaction. */
export type ImportRow = Pick<
  TransactionDocument,
  | 'account_id'
  | 'transaction_date'
  | 'market'
  | 'symbol'
  | 'transaction_type'
  | 'currency'
  | 'quantity'
  | 'price'
>;

/** A proposed SELL that would oversell its account lot; amounts are 10dp decimal strings. */
export interface ImportOversell {
  /** Index into the proposed rows. */
  index: number;
  /** How much this row could sell without overselling. */
  sellable: string;
  requested: string;
}

const dec = (v: string, row: ImportRow) => new Money(v, row.currency).toDecimalString();

/**
 * Duplicate key over date, account, market + symbol (case-insensitive), side, quantity and
 * price, with numbers normalized through Money so `1000` equals `1000.0000000000`.
 */
export function transactionDuplicateKey(row: ImportRow): string {
  return [
    row.transaction_date,
    row.account_id,
    row.market,
    row.symbol.toUpperCase(),
    row.transaction_type,
    dec(row.quantity, row),
    dec(row.price, row),
  ].join('|');
}

/** Indexes of proposed rows that repeat an existing transaction or an earlier proposed row. */
export function findDuplicates(
  existing: readonly ImportRow[],
  proposed: readonly ImportRow[],
): number[] {
  const seen = new Set(existing.map(transactionDuplicateKey));
  const dupes: number[] = [];
  proposed.forEach((row, i) => {
    const key = transactionDuplicateKey(row);
    if (seen.has(key)) dupes.push(i);
    else seen.add(key);
  });
  return dupes;
}

interface Item {
  row: ImportRow;
  /** Proposed row index, or -1 for an existing transaction. */
  index: number;
}

const lotKey = (r: ImportRow) =>
  `${r.account_id}|${r.market}|${r.symbol.toUpperCase()}|${r.currency}`;

/** Existing SELLs that already oversell without the import (pre-existing data issues). */
function preexistingOversells(items: Item[]): Set<Item> {
  const bad = new Set<Item>();
  let held: Money | null = null;
  for (const item of items) {
    const q = new Money(item.row.quantity, item.row.currency);
    held ??= Money.zero(item.row.currency);
    if (item.row.transaction_type === 'BUY') held = held.add(q);
    else if (item.row.transaction_type === 'SELL') {
      if (q.compareTo(held) > 0) {
        bad.add(item);
        held = Money.zero(item.row.currency);
      } else held = held.subtract(q);
    }
  }
  return bad;
}

/**
 * Account-level oversell check for an import batch (spec transaction-import). Replays existing
 * and proposed rows per account lot in chronological order and reports proposed SELLs that
 * oversell — directly, or by starving a later existing SELL. Oversells already present without
 * the import are not blamed on it.
 */
export function findImportOversells(
  existing: readonly ImportRow[],
  proposed: readonly ImportRow[],
): ImportOversell[] {
  const groups = new Map<string, Item[]>();
  const add = (item: Item) => {
    const key = lotKey(item.row);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  };
  existing.forEach((row) => add({ row, index: -1 }));
  proposed.forEach((row, index) => add({ row, index }));

  const issues = new Map<number, ImportOversell>();
  for (const unsorted of groups.values()) {
    const items = sortTransactionsChronologically(
      unsorted.map((it) => ({
        ...it,
        transaction_date: it.row.transaction_date,
        transaction_type: it.row.transaction_type,
      })),
    );
    const existingOnly = preexistingOversells(items.filter((it) => it.index === -1));
    const currency = items[0]?.row.currency;
    if (!currency) continue;
    let held = Money.zero(currency);
    const priorProposedSells: { item: Item; qty: Money }[] = [];

    for (const item of items) {
      const q = new Money(item.row.quantity, currency);
      if (item.row.transaction_type === 'BUY') {
        held = held.add(q);
        continue;
      }
      if (item.row.transaction_type !== 'SELL') continue;
      if (q.compareTo(held) <= 0) {
        held = held.subtract(q);
        if (item.index >= 0) priorProposedSells.push({ item, qty: q });
        continue;
      }
      if (item.index >= 0) {
        // The proposed sell itself oversells; treat it as not applied.
        issues.set(item.index, {
          index: item.index,
          sellable: held.toDecimalString(),
          requested: q.toDecimalString(),
        });
        continue;
      }
      if ([...existingOnly].some((e) => e.row === item.row)) {
        held = Money.zero(currency);
        continue;
      }
      // An existing sell now oversells: blame the latest earlier proposed sell.
      const culprit = priorProposedSells.pop();
      if (culprit) {
        const deficit = q.subtract(held);
        const room = culprit.qty.subtract(deficit);
        issues.set(culprit.item.index, {
          index: culprit.item.index,
          sellable: (room.isNegative() ? Money.zero(currency) : room).toDecimalString(),
          requested: culprit.qty.toDecimalString(),
        });
      }
      held = Money.zero(currency);
    }
  }
  return [...issues.values()].sort((a, b) => a.index - b.index);
}
