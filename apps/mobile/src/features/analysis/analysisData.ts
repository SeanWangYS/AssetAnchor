import { convertMoney, type Money, type RateMap } from '@assetanchor/shared';

/**
 * 分析頁的本地顯示層 helpers（features/analysis 私有）——demo 匯率 fallback + 格式化。
 *
 * 資料真值化（wire-analysis-real-data）後，聚合輸入來自真實持倉 × 報價：
 * - 持倉：transactions（onSnapshot store）→ shared `deriveHoldings`；
 * - 市值：shared `buildAnalysisInput`（現價 × 股數，缺報價排除 + pending/stale 計數）；
 * - 聚合數學：shared `aggregateHoldings`（純函式、單元測試覆蓋）。
 * 本檔只剩與資料源無關的顯示層工具，消費端 import 路徑不變。
 *
 * 內部基準幣別＝TWD；跨幣別合計/損益/軸刻度於顯示時以最新 exchange_rates 即時換算（ADR-0005 / design §5）。
 */

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

/** 把 TWD 基準的 Money 換算成顯示幣別（TWD 原值返回 / USD 以匯率換算）。 */
export function toDisplay(twd: Money, display: DisplayCurrency, rates: RateMap): Money {
  return convertMoney(twd, rates, display);
}

/**
 * Hero 註腳用的實際 USD/TWD 匯率標籤（取代寫死 30.95）：
 * 顯示層字串（四捨五入至 2 位、去尾零），非金錢運算（ADR-0005 toNumber 逃生門範圍）。
 */
export function fxFootnoteRate(rates: RateMap): string {
  const raw = rates['USD_TWD'] ?? DEMO_RATES['USD_TWD'] ?? '30.95';
  const n = Number(raw);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '—';
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
