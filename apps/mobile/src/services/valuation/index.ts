import {
  Money,
  convertMoney,
  isFresh,
  type Currency,
  type Market,
  type Position,
  type QuoteErrorCode,
  type RateMap,
  type RealizedEvent,
} from '@assetanchor/shared';
import type { QuoteEntry } from '../quotes';

/**
 * 估值層純函式（services/valuation）——由 features/holdings 上移，讓 holdings 與 accounts 兩個
 * feature 皆能合法消費（依賴方向 `features/* → services/*`，不互相 import）。
 *
 * 韌性原則（resilient-quote-display）：有報價（新鮮或過期）先納入彙總、缺者標「更新中」/「查無代號」；
 * 過期仍納入市值但今日漲跌只用新鮮報價。金額一律 `Money`（ADR-0005），UI 出口才格式化。
 */

/** demo 匯率 fallback：1 USD = 30.95 TWD（rates 未就緒時用；移除屬另案，見 account-detail-market-value Non-goals）。 */
export const DEMO_USD_TWD = '30.95';

/** 把原幣別 Money 換算成顯示幣別（rates 優先、退 demo 匯率；無法換算回 null）。 */
export function toDisplay(amount: Money, rates: RateMap | null, to: Currency): Money | null {
  if (amount.currency === to) return amount;
  if (rates !== null) {
    try {
      return convertMoney(amount, rates, to);
    } catch {
      // fall through to demo fallback
    }
  }
  if (amount.currency === 'USD' && to === 'TWD') {
    return new Money(amount.multiply(DEMO_USD_TWD).toDecimalString(), to);
  }
  if (amount.currency === 'TWD' && to === 'USD') {
    return new Money(amount.divide(DEMO_USD_TWD).toDecimalString(), to);
  }
  return null;
}

export interface HeroPosition {
  market: Market;
  symbol: string;
  currency: Currency;
  /** 股數（decimal string）。 */
  quantity: string;
  /** 總成本（原幣別 decimal string）。 */
  totalCost: string;
}

export interface HoldingsHero {
  value: number;
  cost: number;
  unrealized: number;
  returnPct: number;
  today: number | null;
  todayPct: number | null;
  todayKnown: boolean;
  includedCount: number;
  pendingCount: number;
  notFoundCount: number;
  anyStale: boolean;
}

export type QuoteResolver = (market: Market, symbol: string) => QuoteEntry | undefined;
export type QuoteErrorResolver = (market: Market, symbol: string) => QuoteErrorCode | undefined;

/** 計數「無報價且 symbol_not_found」的持倉（hero 為 null 時 screen 判定降級文案用）。 */
export function countQuoteNotFound(
  positions: readonly HeroPosition[],
  getQuote: QuoteResolver,
  errorOf: QuoteErrorResolver,
): number {
  let n = 0;
  for (const p of positions) {
    if (!getQuote(p.market, p.symbol) && errorOf(p.market, p.symbol) === 'symbol_not_found') {
      n += 1;
    }
  }
  return n;
}

export function computeHoldingsHero(
  positions: readonly HeroPosition[],
  getQuote: QuoteResolver,
  rates: RateMap | null,
  displayCcy: Currency,
  nowMs: number,
  errorOf?: QuoteErrorResolver,
): HoldingsHero | null {
  if (positions.length === 0 || rates === null) return null;

  let value = Money.zero(displayCcy);
  let cost = Money.zero(displayCcy);
  let today = Money.zero(displayCcy);
  let todayKnown = true;
  let includedCount = 0;
  let pendingCount = 0;
  let notFoundCount = 0;
  let anyStale = false;

  for (const p of positions) {
    const q = getQuote(p.market, p.symbol);
    if (!q) {
      if (errorOf?.(p.market, p.symbol) === 'symbol_not_found') notFoundCount += 1;
      else pendingCount += 1;
      todayKnown = false;
      continue;
    }
    // 報價幣別由市場決定（enable-crypto-quotes D9）：以 q.currency 定價，與成本幣別分離。
    const price = new Money(q.price, q.currency);
    const mv = toDisplay(price.multiply(p.quantity), rates, displayCcy);
    const c = toDisplay(Money.fromDecimalString(p.totalCost, p.currency), rates, displayCcy);
    if (mv === null || c === null) {
      pendingCount += 1;
      todayKnown = false;
      continue;
    }
    value = value.add(mv);
    cost = cost.add(c);
    includedCount += 1;

    const fresh = isFresh(q.fetchedAtMs, nowMs);
    if (!fresh) anyStale = true;
    if (fresh && q.prevClose) {
      const ch = toDisplay(
        price.subtract(new Money(q.prevClose, q.currency)).multiply(p.quantity),
        rates,
        displayCcy,
      );
      if (ch) today = today.add(ch);
      else todayKnown = false;
    } else {
      todayKnown = false;
    }
  }

  if (includedCount === 0) return null;

  const unrealized = value.subtract(cost);
  const returnPct = cost.isZero()
    ? 0
    : unrealized.divide(cost.toDecimalString()).multiply('100').toNumber();
  const prevValue = value.subtract(today);
  const todayPct =
    !todayKnown || prevValue.isZero()
      ? null
      : today.divide(prevValue.toDecimalString()).multiply('100').toNumber();

  return {
    value: value.toNumber(),
    cost: cost.toNumber(),
    unrealized: unrealized.toNumber(),
    returnPct,
    today: todayKnown ? today.toNumber() : null,
    todayPct,
    todayKnown,
    includedCount,
    pendingCount,
    notFoundCount,
    anyStale,
  };
}

/** 單一持倉的估值（原幣別）：市值、成本、未實現、報酬%、是否過期。缺報價回 null（UI 降級）。 */
export interface PositionValuation {
  /** 市值（原幣別）= 現價 × 股數。 */
  marketValue: Money;
  /** 成本（原幣別）= totalCost。 */
  cost: Money;
  /** 未實現損益（原幣別）= 市值 − 成本。 */
  unrealized: Money;
  /** 報酬% =（現價 − 均價）/ 均價 × 100（均價 0 時 0）。 */
  returnPct: number;
  /** 報價是否過期（>15min TTL）。 */
  stale: boolean;
}

/**
 * 單一持倉估值（供帳戶詳情/列表的持股列與市值合計用）。原幣別、不做顯示換算
 * （換算交呼叫端以 `toDisplay` 處理）。缺報價回 `null` → 呼叫端降級為「更新中…」。純函式。
 */
/**
 * 報價金額（price / prevClose）以報價幣別建 Money，必要時換算到指定幣別（rates 優先、
 * 退 demo FX）；無法換算回 null（呼叫端降級「更新中…」）。報價幣別 vs 成本幣別分離的
 * 單一換算入口（enable-crypto-quotes D9），持倉列 / 個股明細 / 估值共用。
 */
export function quoteMoneyIn(
  value: string,
  quote: QuoteEntry,
  to: Currency,
  rates: RateMap | null,
): Money | null {
  const m = new Money(value, quote.currency);
  return quote.currency === to ? m : toDisplay(m, rates, to);
}

export function positionValuation(
  position: Position,
  quote: QuoteEntry | undefined,
  nowMs: number,
  rates: RateMap | null = null,
): PositionValuation | null {
  if (!quote) return null;
  // 報價幣別由市場決定（D9）；與 lot 幣別不同時先換算到 lot 幣別（rates 優先、退 demo FX），
  // 無法換算 → null（呼叫端降級「更新中…」），維持本函式「原幣別輸出」契約。
  const price = quoteMoneyIn(quote.price, quote, position.currency, rates);
  if (price === null) return null;
  const marketValue = price.multiply(position.quantity);
  const cost = Money.fromDecimalString(position.totalCost, position.currency);
  const avg = Money.fromDecimalString(position.averageCost, position.currency);
  const returnPct = avg.isZero()
    ? 0
    : price.subtract(avg).divide(position.averageCost).multiply('100').toNumber();
  return {
    marketValue,
    cost,
    unrealized: marketValue.subtract(cost),
    returnPct,
    stale: !isFresh(quote.fetchedAtMs, nowMs),
  };
}

/** `realizedInMonth` 回傳：當月已實現損益加總（顯示幣別）+ 納入的事件數（0 → UI 顯示中性空狀態）。 */
export interface RealizedInMonth {
  sum: Money;
  count: number;
}

/**
 * 指定月份（`monthPrefix` = 本地時間 `YYYY-MM`）的已實現損益加總。
 * 以 `transaction_date` 前綴比對過濾當月 SELL 事件，各原幣別以 `toDisplay` 換算成 `displayCcy` 後加總。
 * `count === 0` 代表當月無賣出（呼叫端據此顯示中性空狀態）。純函式。
 */
export function realizedInMonth(
  events: readonly RealizedEvent[],
  monthPrefix: string,
  rates: RateMap | null,
  displayCcy: Currency,
): RealizedInMonth {
  let sum = Money.zero(displayCcy);
  let count = 0;
  for (const ev of events) {
    if (!ev.transaction_date.startsWith(monthPrefix)) continue;
    const conv = toDisplay(new Money(ev.realized, ev.currency), rates, displayCcy);
    if (conv === null) continue;
    sum = sum.add(conv);
    count += 1;
  }
  return { sum, count };
}
