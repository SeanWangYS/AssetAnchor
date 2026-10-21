import {
  Money,
  formatAmount,
  formatPercent,
  isFresh,
  type AccountHoldingsGroup,
  type Currency,
  type Market,
  type PerformanceSummary,
  type Position,
  type QuoteErrorCode,
  type RateMap,
} from '@assetanchor/shared';
import type { QuoteEntry } from '../../services/quotes';
import { quoteMoneyIn, toDisplay } from '../../services/valuation';
import type { HoldingsSort, HoldingsSortKey } from '../../services/localPrefs/holdingsSort';
import { fmtShares, marketLabel } from './holdingsDemo';

/**
 * Pure model for the holdings table (design spec D10): per-row metrics, grouping and
 * sorting. The screen only renders what this returns. All amounts are converted to the
 * display currency with Money; `toNumber()` is used only for sort values.
 */

export type SortableColumn = Exclude<HoldingsSortKey, 'symbol'>;
export type CellTone = 'strong' | 'up' | 'down' | 'flat' | 'muted' | 'faint';
export interface Cell {
  text: string;
  tone: CellTone;
}
export type RowStatus = 'ok' | 'pending' | 'not_found';

export interface HoldingTableRow {
  key: string;
  market: Market;
  symbol: string;
  status: RowStatus;
  /** Accounts the row is scoped to (account grouping); undefined = all accounts. */
  accountIds: readonly string[] | undefined;
  cells: Record<SortableColumn, Cell>;
  sortValues: Record<SortableColumn, number | null>;
  /** Market value in the display currency; null without a usable quote. */
  marketValue: Money | null;
  /** True when the return column shows a cumulative (not annualized) value. */
  xirrCumulative: boolean;
}

export interface RowContext {
  getQuote: (market: Market, symbol: string) => QuoteEntry | undefined;
  errorOf: (market: Market, symbol: string) => QuoteErrorCode | undefined;
  rates: RateMap | null;
  displayCurrency: Currency;
  nowMs: number;
  /** Whole-portfolio market value (weight denominator, regardless of grouping). */
  totalValue: Money | null;
  performanceOf: (
    position: Position,
    accountIds: readonly string[] | undefined,
    marketValue: Money,
  ) => PerformanceSummary | null;
}

const BLANK: Cell = { text: '', tone: 'muted' };
const DASH: Cell = { text: '—', tone: 'faint' };

/** Fixed 2-dp amount with thousands separators (prices and average cost, never negative). */
function twoDp(m: Money): string {
  const [int = '0', frac = '00'] = m.toDisplayString(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

function toneOf(n: number): CellTone {
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
}

function pctCell(pct: number | null): Cell {
  return pct === null ? DASH : { text: formatPercent(pct), tone: toneOf(pct) };
}

export function buildHoldingRow(
  position: Position,
  ctx: RowContext,
  opts: { keyPrefix?: string; accountIds?: readonly string[] } = {},
): HoldingTableRow {
  const { displayCurrency: ccy, rates } = ctx;
  const key = `${opts.keyPrefix ?? ''}${position.market}_${position.symbol}`;
  const cost = toDisplay(new Money(position.totalCost, position.currency), rates, ccy);
  const avgNative = new Money(position.averageCost, position.currency);
  const avg = toDisplay(avgNative, rates, ccy);
  const quote = ctx.getQuote(position.market, position.symbol);
  const priceNative = quote ? quoteMoneyIn(quote.price, quote, position.currency, rates) : null;
  const price = priceNative ? toDisplay(priceNative, rates, ccy) : null;

  const base = {
    key,
    market: position.market,
    symbol: position.symbol,
    accountIds: opts.accountIds,
    xirrCumulative: false,
  };
  const quoteFree = {
    qty: { text: fmtShares(position.quantity, position.currency), tone: 'muted' as const },
    avg: avg ? { text: twoDp(avg), tone: 'muted' as const } : DASH,
    cost: cost ? { text: formatAmount(cost.toDecimalString(), ccy), tone: 'muted' as const } : DASH,
  };
  const quoteFreeSort = {
    qty: Number(position.quantity),
    avg: avg?.toNumber() ?? null,
    cost: cost?.toNumber() ?? null,
  };

  // A row needs its price, cost and average in the display currency; if any conversion is
  // unavailable (no quote, or no rate for this currency pair) it degrades as "updating".
  if (priceNative === null || price === null || cost === null || avg === null) {
    const notFound = ctx.errorOf(position.market, position.symbol) === 'symbol_not_found';
    return {
      ...base,
      status: notFound ? 'not_found' : 'pending',
      marketValue: null,
      cells: {
        mv: { text: notFound ? '查無代號' : '更新中…', tone: notFound ? 'down' : 'muted' },
        ret: BLANK,
        unreal: BLANK,
        today: BLANK,
        price: BLANK,
        weight: BLANK,
        xirr: BLANK,
        ...quoteFree,
      },
      sortValues: {
        mv: null,
        ret: null,
        unreal: null,
        today: null,
        price: null,
        weight: null,
        xirr: null,
        ...quoteFreeSort,
      },
    };
  }

  const mv = price.multiply(position.quantity);
  const unreal = mv.subtract(cost);
  // Return % in the native currency: the FX rate cancels out, so this excludes FX gains.
  const ret = avgNative.isZero()
    ? null
    : priceNative.subtract(avgNative).divide(position.averageCost).multiply('100').toNumber();
  const today =
    quote && quote.prevClose !== null && isFresh(quote.fetchedAtMs, ctx.nowMs)
      ? new Money(quote.price, quote.currency)
          .subtract(new Money(quote.prevClose, quote.currency))
          .divide(quote.prevClose)
          .multiply('100')
          .toNumber()
      : null;
  const weight =
    ctx.totalValue && !ctx.totalValue.isZero() && ctx.totalValue.currency === mv.currency
      ? mv.divide(ctx.totalValue.toDecimalString()).multiply('100').toNumber()
      : null;
  const perf = ctx.performanceOf(position, opts.accountIds, mv);
  const xirr = perf === null ? null : Number(perf.rate) * 100;

  return {
    ...base,
    status: 'ok',
    marketValue: mv,
    xirrCumulative: perf?.kind === 'cumulative',
    cells: {
      mv: { text: formatAmount(mv.toDecimalString(), ccy), tone: 'strong' },
      ret: pctCell(ret),
      unreal: {
        text: `${unreal.isNegative() ? '−' : unreal.isPositive() ? '+' : ''}${formatAmount(
          (unreal.isNegative() ? unreal.negate() : unreal).toDecimalString(),
          ccy,
        )}`,
        tone: toneOf(unreal.toNumber()),
      },
      today: pctCell(today),
      price: { text: twoDp(price), tone: 'muted' },
      weight: weight === null ? DASH : { text: `${weight.toFixed(1)}%`, tone: 'muted' },
      xirr: pctCell(xirr),
      ...quoteFree,
    },
    sortValues: {
      mv: mv.toNumber(),
      ret,
      unreal: unreal.toNumber(),
      today,
      price: price.toNumber(),
      weight,
      xirr,
      ...quoteFreeSort,
    },
  };
}

export type TableGroupMode = '持股' | '帳戶' | '類別';

export interface TableSection {
  key: string;
  /** null = no header row (holdings mode). */
  label: string | null;
  count: number;
  subtotalText: string;
  skippedCount: number;
  rows: HoldingTableRow[];
}

function subtotalOf(rows: readonly HoldingTableRow[], ccy: Currency): Money {
  return rows.reduce((sum, r) => (r.marketValue ? sum.add(r.marketValue) : sum), Money.zero(ccy));
}

function section(
  key: string,
  label: string | null,
  rows: HoldingTableRow[],
  ccy: Currency,
  skippedCount = 0,
): TableSection & { subtotal: Money } {
  const subtotal = subtotalOf(rows, ccy);
  return {
    key,
    label,
    count: rows.length,
    subtotal,
    subtotalText: formatAmount(subtotal.toDecimalString(), ccy),
    skippedCount,
    rows,
  };
}

/**
 * Sections for the three groupings. Groups are ordered by display-currency subtotal,
 * largest first; the account grouping keeps "未分類" (accountId '') last. In the account
 * grouping each row is scoped to its account so the return column counts only that
 * account's trades (owner decision 2026-10-21).
 */
export function buildTableSections(input: {
  mode: TableGroupMode;
  positions: readonly Position[];
  accountGroups: readonly AccountHoldingsGroup[];
  /** account_ids found in transactions but missing from the account list. */
  orphanAccountIds: readonly string[];
  ctx: RowContext;
}): TableSection[] {
  const { mode, ctx } = input;
  const ccy = ctx.displayCurrency;
  const bySubtotal = (a: { subtotal: Money }, b: { subtotal: Money }) =>
    b.subtotal.compareTo(a.subtotal);

  if (mode === '持股') {
    return [
      section(
        'all',
        null,
        input.positions.map((p) => buildHoldingRow(p, ctx)),
        ccy,
      ),
    ];
  }

  if (mode === '帳戶') {
    const sections = input.accountGroups.map((g) => {
      const accountIds = g.accountId === '' ? input.orphanAccountIds : [g.accountId];
      const keyPrefix = `${g.accountId === '' ? 'unassigned' : g.accountId}:`;
      return {
        orphan: g.accountId === '',
        ...section(
          g.accountId || 'unassigned',
          g.accountName,
          g.positions.map((p) => buildHoldingRow(p, ctx, { keyPrefix, accountIds })),
          ccy,
          g.skipped.length,
        ),
      };
    });
    return [
      ...sections.filter((s) => !s.orphan).sort(bySubtotal),
      ...sections.filter((s) => s.orphan),
    ];
  }

  const byMarket = new Map<Market, Position[]>();
  for (const p of input.positions) byMarket.set(p.market, [...(byMarket.get(p.market) ?? []), p]);
  return [...byMarket.entries()]
    .map(([market, list]) =>
      section(
        market,
        marketLabel(market),
        list.map((p) => buildHoldingRow(p, ctx)),
        ccy,
      ),
    )
    .sort(bySubtotal);
}

/**
 * Sorts rows by a column. Missing values always go last regardless of direction; ties
 * fall back to symbol ascending. Returns a new array.
 */
export function sortRows(rows: readonly HoldingTableRow[], sort: HoldingsSort): HoldingTableRow[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const bySymbol = (a: HoldingTableRow, b: HoldingTableRow) => a.symbol.localeCompare(b.symbol);
  if (sort.key === 'symbol') return [...rows].sort((a, b) => sign * bySymbol(a, b));
  const col = sort.key;
  return [...rows].sort((a, b) => {
    const va = a.sortValues[col];
    const vb = b.sortValues[col];
    if (va === null && vb === null) return bySymbol(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    return va === vb ? bySymbol(a, b) : sign * (va - vb);
  });
}

/** Header tap: a new column starts descending (symbol ascending); the same column flips. */
export function nextSort(current: HoldingsSort, key: HoldingsSortKey): HoldingsSort {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'symbol' ? 'asc' : 'desc' };
}
