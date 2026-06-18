import { Money, isFresh, type Currency, type Market, type RateMap } from '@assetanchor/shared';
import type { QuoteEntry } from '../../services/quotes';
import { toDisplay } from './holdingsDemo';

/**
 * 持倉總覽 Hero/bento 的彙總純函式（resilient-quote-display）。
 *
 * 韌性原則（取代原 all-or-nothing）：
 * - 有報價（新鮮或過期）的持倉先加總進總市值/未實現/報酬率；缺報價者計入 `pendingCount` 跳過。
 * - 過期報價仍納入市值（標 `anyStale`），但「今日漲跌」**只用新鮮報價**計算，
 *   含過期或缺 prevClose 時 `todayKnown=false`、`today=null`（不以過期價算今日，避免誤導）。
 * - 僅當「可納入數 === 0」（或無持倉 / 匯率未就緒）才回 `null` → 畫面顯示「報價載入中…」。
 *
 * 金額一律 `Money`（ADR-0005）；跨幣別於顯示層以 `toDisplay`（rates 優先、退 demo 匯率）換算。
 * 純函式、無 I/O：報價以 `getQuote` resolver 注入，便於測試（不耦合 store / firebase）。
 */
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
  /** 總市值（顯示幣別）。 */
  value: number;
  /** 納入彙總者的總成本（顯示幣別）。 */
  cost: number;
  /** 未實現損益 = value − cost。 */
  unrealized: number;
  /** 總報酬率 %（cost=0 時為 0）。 */
  returnPct: number;
  /** 今日損益（僅全數新鮮時為數值，否則 null）。 */
  today: number | null;
  /** 今日損益 %（today 為 null 或 prevValue=0 時為 null）。 */
  todayPct: number | null;
  /** 今日損益是否可計（任一檔過期 / 缺 prevClose 即 false）。 */
  todayKnown: boolean;
  /** 已納入彙總的持倉數（有可用報價且可換算）。 */
  includedCount: number;
  /** 缺報價 / 無法換算而排除的持倉數（顯示「N 檔更新中」）。 */
  pendingCount: number;
  /** 是否有任一納入的報價為過期值（顯示「截至 HH:MM／延遲」）。 */
  anyStale: boolean;
}

export type QuoteResolver = (market: Market, symbol: string) => QuoteEntry | undefined;

export function computeHoldingsHero(
  positions: readonly HeroPosition[],
  getQuote: QuoteResolver,
  rates: RateMap | null,
  displayCcy: Currency,
  nowMs: number,
): HoldingsHero | null {
  if (positions.length === 0 || rates === null) return null;

  let value = Money.zero(displayCcy);
  let cost = Money.zero(displayCcy);
  let today = Money.zero(displayCcy);
  let todayKnown = true;
  let includedCount = 0;
  let pendingCount = 0;
  let anyStale = false;

  for (const p of positions) {
    const q = getQuote(p.market, p.symbol);
    if (!q) {
      pendingCount += 1;
      todayKnown = false;
      continue;
    }
    const price = new Money(q.price, p.currency);
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
    // 今日漲跌只用新鮮報價（且需 prevClose）；否則整體 today 不可計。
    if (fresh && q.prevClose) {
      const ch = toDisplay(
        price.subtract(new Money(q.prevClose, p.currency)).multiply(p.quantity),
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
    anyStale,
  };
}
