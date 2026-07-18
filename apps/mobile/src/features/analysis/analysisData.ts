import {
  convertMoney,
  formatFxRate,
  formatMoney as sharedFormatMoney,
  formatPercent as sharedFormatPercent,
  type Money,
  type RateMap,
} from '@assetanchor/shared';

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

/** 聚合結果型別 re-export（消費端 import 不變）。 */
export type {
  AnalysisAggregate,
  AnalysisHolding,
  AnalysisTotals,
  AssetTypeRollup,
} from '@assetanchor/shared';

/** 把 TWD 基準的 Money 換算成顯示幣別（TWD 原值返回 / USD 以匯率換算）。 */
export function toDisplay(twd: Money, display: DisplayCurrency, rates: RateMap): Money {
  return convertMoney(twd, rates, display);
}

/**
 * ⚠️ adapter only——格式規則的唯一實作點在 `packages/shared` format 模組
 * （fix-display-formatting 規則表）；以下委派**禁止任何格式規則**。
 * @deprecated 畫面改直接 import shared（backlog：刪 shim）。
 */

/** Hero 註腳用的實際 USD/TWD 匯率標籤：RateMap 取值留此、格式委派 shared（固定 2 位，P2-6）。 */
export function fxFootnoteRate(rates: RateMap): string {
  const raw = rates['USD_TWD'] ?? DEMO_RATES['USD_TWD'] ?? '30.95';
  return formatFxRate(raw);
}

/**
 * 金額顯示字串（**保留 Math.abs 語意**——消費端把本函式輸出餵 `Pnl` 的 `display`，
 * Pnl 契約要求絕對值字串；委派 shared 後小數位循幣別規則：TWD 0 / USD 2）。
 */
export function formatAmount(money: Money, display: DisplayCurrency): string {
  const abs = money.toDecimalString().replace(/^-/, '');
  return sharedFormatMoney(abs, display);
}

/** 帶正負號的金額（HBar 右側字串用；零值不帶號——零值中性規則）。 */
export function formatSignedAmount(money: Money, display: DisplayCurrency): string {
  if (money.isZero()) return formatAmount(money, display);
  const sign = money.isNegative() ? '−' : '+';
  return `${sign}${formatAmount(money, display)}`;
}

/**
 * 報酬率字串（**保留 positional 簽名與 signed 預設 false**——shared 預設 signed:true，
 * 直接 re-export 會讓 Pnl display 出現雙符號）。精度循規則表：報酬率 2 位（P3-3）。
 */
export function formatPercent(pct: number, signed = false): string {
  return sharedFormatPercent(pct, { decimals: 2, signed });
}
