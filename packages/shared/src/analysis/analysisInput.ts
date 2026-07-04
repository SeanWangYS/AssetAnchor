import { Money } from '../money/index.js';
import { isFresh } from '../quotes/index.js';
import type { AssetType } from '../enums/asset-types.js';
import type { Market } from '../enums/markets.js';
import type { Position } from '../portfolio/deriveHoldings.js';
import type { AnalysisRawHolding } from './analysisAggregate.js';

/**
 * 分析頁的「持倉 × 報價 → 聚合輸入」映射——與資料來源無關的純函式（可測，納入 coverage gate）。
 * 每檔市值 = 報價現價 × 股數（原幣別、全程 `Money`，ADR-0005）；成本 = `Position.totalCost`。
 * 降級語意對齊持倉頁 `computeHoldingsHero`（resilient-quote-display）：
 * - 缺報價 → 排除於聚合並計入 `pendingCount`（不以假值或 0 充數）。
 * - 過期報價（isFresh=false，含未來時戳）→ 仍以最後已知價納入市值，但標 `anyStale`。
 * 報價 / symbol metadata 以 resolver 注入（不耦合 store / firebase）；輸出直接餵 `aggregateHoldings`。
 */

/** 單檔報價輸入（原幣別現價，10 位小數 string）。 */
export interface AnalysisQuoteInput {
  price: string;
  fetchedAtMs: number;
}

/** 單檔 symbol metadata（缺值 fallback：name = raw symbol、assetType = 'STOCK'）。 */
export interface AnalysisSymbolMeta {
  name?: string;
  assetType?: AssetType;
}

export type AnalysisQuoteResolver = (
  market: Market,
  symbol: string,
) => AnalysisQuoteInput | undefined;

export type AnalysisMetaResolver = (
  market: Market,
  symbol: string,
) => AnalysisSymbolMeta | undefined;

/** 聚合輸入 + 部分渲染揭露計數。 */
export interface AnalysisInput {
  /** 有可用報價的持倉（原幣別 raw holdings），餵給 `aggregateHoldings`。 */
  rawHoldings: AnalysisRawHolding[];
  /** 有報價、已納入聚合的持倉數。 */
  includedCount: number;
  /** 缺報價、已排除的持倉數（顯示「N 檔報價更新中」）。 */
  pendingCount: number;
  /** 是否有任一納入的報價為過期值（顯示「部分為最後已知報價（延遲）」）。 */
  anyStale: boolean;
}

export function buildAnalysisInput(
  positions: readonly Position[],
  resolveQuote: AnalysisQuoteResolver,
  resolveMeta: AnalysisMetaResolver,
  nowMs: number,
): AnalysisInput {
  const rawHoldings: AnalysisRawHolding[] = [];
  let pendingCount = 0;
  let anyStale = false;

  for (const p of positions) {
    const quote = resolveQuote(p.market, p.symbol);
    if (!quote) {
      pendingCount += 1;
      continue;
    }
    const value = new Money(quote.price, p.currency).multiply(p.quantity);
    const meta = resolveMeta(p.market, p.symbol);
    rawHoldings.push({
      symbol: p.symbol,
      name: meta?.name?.trim() ? meta.name : p.symbol,
      assetType: meta?.assetType ?? 'STOCK',
      currency: p.currency,
      cost: p.totalCost,
      value: value.toDecimalString(),
    });
    if (!isFresh(quote.fetchedAtMs, nowMs)) anyStale = true;
  }

  return { rawHoldings, includedCount: rawHoldings.length, pendingCount, anyStale };
}
