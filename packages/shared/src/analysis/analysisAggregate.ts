import { Money } from '../money/index.js';
import { convertMoney } from '../fx/index.js';
import type { RateMap } from '../types/exchange-rate.js';
import { ASSET_TYPES, type AssetType } from '../enums/asset-types.js';
import type { Currency } from '../enums/currencies.js';

/**
 * 分析頁的持倉聚合——**與資料來源無關**的純函式（可測，納入 coverage gate）。
 * 輸入一組原幣別 raw holdings + 匯率表 + 基準幣別，輸出基準幣別的 totals 與類別 rollup。
 * 金額全程 `Money`；跨幣別合計用 `convertMoney`（最新匯率即時換算，ADR-0005）。
 * mock vs 真實資料的決策留在消費端（mobile）；本檔只負責聚合數學。
 *
 * 資產配置維度 = `asset_type` enum 本身（enum 驅動）：`byAssetType` 逐一列舉
 * `ASSET_TYPES`，故**新增一個資產類型 enum 值即自動多一個 rollup**，無需改本檔。
 * 顯示標籤與配色屬展示層（mobile core），本檔不涉繁中字串/顏色。
 */

/** 單一持倉的市場原幣別輸入（cost = 成本基礎、value = 目前市值）。 */
export interface AnalysisRawHolding {
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: Currency;
  /** 市場原幣別成本基礎（十進位 string）。 */
  cost: string;
  /** 市場原幣別目前市值（十進位 string）。 */
  value: string;
}

/** 單一持倉，成本/市值/損益皆以基準幣別 Money 表示。 */
export interface AnalysisHolding {
  symbol: string;
  name: string;
  assetType: AssetType;
  cost: Money;
  value: Money;
  /** 未實現損益 = 市值 − 成本。 */
  pnl: Money;
  /** 報酬率（幣別無關）= (市值 − 成本) / 成本。 */
  returnPct: number;
}

/** 整體彙總（基準幣別）。 */
export interface AnalysisTotals {
  value: Money;
  cost: Money;
  pnl: Money;
  returnPct: number;
}

/** 單一資產類型彙總（圓餅 / 圖例）。 */
export interface AssetTypeRollup {
  assetType: AssetType;
  count: number;
  value: Money;
  /** 佔總市值百分比（幣別無關）。 */
  sharePct: number;
}

/** 完整聚合結果（基準幣別）。 */
export interface AnalysisAggregate {
  holdings: readonly AnalysisHolding[];
  totals: AnalysisTotals;
  byAssetType: readonly AssetTypeRollup[];
}

/** 報酬率 %（幣別無關）：toNumber 僅用於 UI/charting（百分比，非金錢）。防零除回 0。 */
export function returnPercent(value: Money, cost: Money): number {
  if (cost.isZero()) return 0;
  return value.subtract(cost).divide(cost.toDecimalString()).multiply(100).toNumber();
}

/**
 * 聚合一組 raw holdings → 基準幣別的 holdings / totals / byAssetType。純函式、deterministic。
 * 跨幣別以 `convertMoney`（{FROM}_{TO} key）換算；rates 缺對應 key 時 fail loud（convertMoney 擲錯），
 * 由呼叫端 try/catch 後優雅降級。`byAssetType` 逐一列舉 `ASSET_TYPES`（enum 驅動），
 * 未持有的類型 count 為 0（供消費端 filter 掉空切片）。
 */
export function aggregateHoldings(
  rawHoldings: readonly AnalysisRawHolding[],
  rates: RateMap,
  base: Currency,
): AnalysisAggregate {
  const holdings: AnalysisHolding[] = rawHoldings.map((h) => {
    const cost = convertMoney(Money.fromDecimalString(h.cost, h.currency), rates, base);
    const value = convertMoney(Money.fromDecimalString(h.value, h.currency), rates, base);
    return {
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      cost,
      value,
      pnl: value.subtract(cost),
      returnPct: returnPercent(value, cost),
    };
  });

  let totalValue = Money.zero(base);
  let totalCost = Money.zero(base);
  for (const h of holdings) {
    totalValue = totalValue.add(h.value);
    totalCost = totalCost.add(h.cost);
  }
  const totals: AnalysisTotals = {
    value: totalValue,
    cost: totalCost,
    pnl: totalValue.subtract(totalCost),
    returnPct: returnPercent(totalValue, totalCost),
  };

  const byAssetType: AssetTypeRollup[] = ASSET_TYPES.map((assetType) => {
    const list = holdings.filter((h) => h.assetType === assetType);
    let value = Money.zero(base);
    for (const h of list) value = value.add(h.value);
    const sharePct = totalValue.isZero()
      ? 0
      : value.divide(totalValue.toDecimalString()).multiply(100).toNumber();
    return { assetType, count: list.length, value, sharePct };
  });

  return { holdings, totals, byAssetType };
}
