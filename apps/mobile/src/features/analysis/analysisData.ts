import {
  aggregateHoldings,
  convertMoney,
  type AnalysisAggregate,
  type AnalysisRawHolding,
  type Currency,
  type Money,
  type RateMap,
} from '@assetanchor/shared';

/**
 * 分析頁的本地資料層（features/analysis 私有）——**僅保留 mock 輸入 + 顯示格式化**；
 * 聚合數學已抽到 `@assetanchor/shared` 的 `aggregateHoldings`（純函式、單元測試覆蓋）。
 *
 * 為什麼是「本地 mock」而非讀真實持倉：
 * - 衍生持倉（deriveHoldings）只在 features/holdings 取用、資料源 transactionsStore 屬 features/transactions；
 *   features 之間禁止互相 import（planning §12）。
 * - 分析頁需要「市值」，而市值需要報價（quotes 尚未串接 → Non-goals）。
 * 因此以原型（aa-analysis-charts.jsx `AHOLD`）mock 為輸入；資料真實化屬後續。
 *
 * 內部基準幣別＝TWD；跨幣別合計/損益/軸刻度於顯示時以最新 exchange_rates 即時換算（ADR-0005 / design §5）。
 */

const BASE: Currency = 'TWD';

/**
 * Demo 匯率（design §5：1 USD = 30.95 TWD「mock 寫死處」）。
 * 實際換算優先讀最新 exchange_rates；store 尚未就緒（rates=null）時退回此值。
 */
export const DEMO_RATES: RateMap = {
  USD_TWD: '30.95',
  TWD_USD: (1 / 30.95).toString(),
};

/** 顯示幣別（全頁 Segmented）。 */
export type DisplayCurrency = 'TWD' | 'USD';

/** 分析顯示類別（個股 / ETF）。型別權威在 shared（`AnalysisClass`），此處別名維持既有命名。 */
export type { AnalysisClass as AssetClass } from '@assetanchor/shared';

/** 聚合結果型別 re-export（消費端 import 不變）。 */
export type {
  AnalysisAggregate,
  AnalysisHolding,
  AnalysisTotals,
  ClassRollup,
} from '@assetanchor/shared';

/**
 * Mock 持倉（市場原幣別）。數字對齊 design spec §5 衍生結果
 * （市值 455,935 / 成本 377,181 / 未實現 +78,754；個股 44.1% vs ETF 55.9%）。
 */
const RAW_HOLDINGS: readonly AnalysisRawHolding[] = [
  {
    symbol: '2330',
    name: '台積電',
    assetType: 'STOCK',
    currency: 'TWD',
    cost: '55000',
    value: '110000',
  },
  {
    symbol: '2317',
    name: '鴻海',
    assetType: 'STOCK',
    currency: 'TWD',
    cost: '35600',
    value: '38000',
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    assetType: 'STOCK',
    currency: 'USD',
    cost: '1444',
    value: '1712.88',
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total',
    assetType: 'ETF',
    currency: 'USD',
    cost: '2820',
    value: '3012',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ',
    assetType: 'ETF',
    currency: 'USD',
    cost: '2010',
    value: '2210',
  },
  {
    symbol: '0050',
    name: '元大台灣50',
    assetType: 'ETF',
    currency: 'TWD',
    cost: '71000',
    value: '72500',
  },
  {
    symbol: '00878',
    name: '國泰永續高股息',
    assetType: 'ETF',
    currency: 'TWD',
    cost: '21400',
    value: '20800',
  },
];

/**
 * 由 mock 原幣別持倉聚合出分析資料（TWD 基準）。委派 shared `aggregateHoldings`（純函式）。
 * rates 缺對應 key 時 fail loud（convertMoney 丟錯），由呼叫端 try/catch 後優雅降級。
 */
export function aggregateAnalysis(rates: RateMap): AnalysisAggregate {
  return aggregateHoldings(RAW_HOLDINGS, rates, BASE);
}

/** 把 TWD 基準的 Money 換算成顯示幣別（TWD 原值返回 / USD 以匯率換算）。 */
export function toDisplay(twd: Money, display: DisplayCurrency, rates: RateMap): Money {
  return convertMoney(twd, rates, display);
}

/** 金額顯示字串：前綴 NT$ / US$ + 千分位、無小數（對齊原型 fA）。 */
export function formatAmount(money: Money, display: DisplayCurrency): string {
  const prefix = display === 'USD' ? 'US$' : 'NT$';
  const n = Math.abs(money.toNumber());
  return `${prefix} ${Math.round(n).toLocaleString('en-US')}`;
}

/** 帶正負號的金額（▲▼ 由 Pnl 元件處理；此處供 HBar 右側字串用，+/− 前綴）。 */
export function formatSignedAmount(money: Money, display: DisplayCurrency): string {
  const sign = money.isNegative() ? '−' : '+';
  return `${sign}${formatAmount(money, display)}`;
}

/** 報酬率字串（百分比帶正負號，一位小數）。 */
export function formatPercent(pct: number, signed = false): string {
  const sign = signed ? (pct >= 0 ? '+' : '−') : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}
