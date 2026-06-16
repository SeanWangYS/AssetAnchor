import {
  Money,
  convertMoney,
  type AssetType,
  type Currency,
  type RateMap,
} from '@assetanchor/shared';

/**
 * 分析頁的本地聚合資料層（features/analysis 私有）。
 *
 * 為什麼是「本地」而非讀真實持倉：
 * - 衍生持倉（deriveHoldings）只在 features/holdings 的 `useHoldings` 取用，且其資料來源
 *   `transactionsStore` 屬 features/transactions。features 之間禁止互相 import（planning §12），
 *   故分析頁不可 import useHoldings / transactionsStore。
 * - 分析頁需要「市值」，而市值需要報價（quotes 尚未串接 → Non-goals）。
 * 因此本檔以設計原型（aa-analysis-charts.jsx `AHOLD`）的 mock 為基礎，
 * 僅消費 `@assetanchor/shared`（Money / convertMoney / 型別）。金額一律走 Money，禁 native float
 * 做金錢運算；toNumber() 只在最後出圖（charts 吃 number）時當逃生門。
 *
 * 內部基準幣別＝TWD（與原型「內部值一律 TWD，顯示時換算」一致）；跨幣別合計、
 * 損益、軸刻度於顯示時以最新 exchange_rates 即時換算（ADR-0005 / design §5），不落地。
 */

const BASE: Currency = 'TWD';

/**
 * Demo 匯率（design §5：1 USD = 30.95 TWD「mock 寫死處」）。
 * 實際換算優先讀最新 exchange_rates；store 尚未就緒（rates=null）時退回此值，
 * 讓分析頁在 Simulator / demo 仍可運作。雙向皆備（convertMoney 需 {FROM}_{TO} key）。
 */
export const DEMO_RATES: RateMap = {
  USD_TWD: '30.95',
  TWD_USD: (1 / 30.95).toString(),
};

/** 顯示幣別（全頁 Segmented）。 */
export type DisplayCurrency = 'TWD' | 'USD';

/** 資產類別維度（圓餅）：個股 / ETF（design D3 / D7）。 */
export type AssetClass = '個股' | 'ETF';

/**
 * 單一持倉的市場原幣別 mock（cost = 成本基礎、value = 目前市值）。
 * 對齊原型 AHOLD：00878 市值微調成小幅虧損，讓正負分色有示範案例。
 */
interface RawHolding {
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: Currency;
  /** 市場原幣別成本基礎（avg × shares）。 */
  cost: string;
  /** 市場原幣別目前市值（mock，待 quotes 串接後改真值）。 */
  value: string;
}

/**
 * Mock 持倉（市場原幣別）。數字對齊 design spec §5 衍生結果
 * （市值 455,935 / 成本 377,181 / 未實現 +78,754；個股 44.1% vs ETF 55.9%）。
 */
const RAW_HOLDINGS: readonly RawHolding[] = [
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

/** assetType → 顯示類別（個股 / ETF）。 */
function classOf(assetType: AssetType): AssetClass {
  return assetType === 'ETF' ? 'ETF' : '個股';
}

/** 單一持倉，成本/市值/損益皆以 TWD Money 表示（內部基準）。 */
export interface AnalysisHolding {
  symbol: string;
  name: string;
  cls: AssetClass;
  /** 成本（TWD）。 */
  cost: Money;
  /** 市值（TWD）。 */
  value: Money;
  /** 未實現損益（TWD）= 市值 − 成本。 */
  pnl: Money;
  /** 報酬率（幣別無關）= (市值 − 成本) / 成本。 */
  returnPct: number;
}

/** 整體彙總（TWD）。 */
export interface AnalysisTotals {
  value: Money;
  cost: Money;
  pnl: Money;
  returnPct: number;
}

/** 單一類別彙總（圓餅 / 圖例）。 */
export interface ClassRollup {
  cls: AssetClass;
  count: number;
  /** 類別市值（TWD）。 */
  value: Money;
  /** 佔總市值百分比（幣別無關）。 */
  sharePct: number;
}

/** 完整聚合結果（全 TWD 基準）。 */
export interface AnalysisAggregate {
  holdings: readonly AnalysisHolding[];
  totals: AnalysisTotals;
  byClass: readonly ClassRollup[];
}

/** 報酬率 %（幣別無關）：toNumber 僅用於 UI/charting（百分比，非金錢）。 */
function returnPercent(value: Money, cost: Money): number {
  if (cost.isZero()) return 0;
  return value.subtract(cost).divide(cost.toDecimalString()).multiply(100).toNumber();
}

/**
 * 由 mock 原幣別持倉聚合出分析資料（TWD 基準）。
 * 跨幣別合計用 convertMoney（USD→TWD）以最新匯率即時換算；rates 缺失時 fail loud
 * （convertMoney 丟錯），由呼叫端 try/catch 後優雅降級。純函式、deterministic。
 */
export function aggregateAnalysis(rates: RateMap): AnalysisAggregate {
  const holdings: AnalysisHolding[] = RAW_HOLDINGS.map((h) => {
    const cost = convertMoney(Money.fromDecimalString(h.cost, h.currency), rates, BASE);
    const value = convertMoney(Money.fromDecimalString(h.value, h.currency), rates, BASE);
    const pnl = value.subtract(cost);
    return {
      symbol: h.symbol,
      name: h.name,
      cls: classOf(h.assetType),
      cost,
      value,
      pnl,
      returnPct: returnPercent(value, cost),
    };
  });

  let totalValue = Money.zero(BASE);
  let totalCost = Money.zero(BASE);
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

  const byClass: ClassRollup[] = (['個股', 'ETF'] as const).map((cls) => {
    const list = holdings.filter((h) => h.cls === cls);
    let value = Money.zero(BASE);
    for (const h of list) value = value.add(h.value);
    const sharePct = totalValue.isZero()
      ? 0
      : value.divide(totalValue.toDecimalString()).multiply(100).toNumber();
    return { cls, count: list.length, value, sharePct };
  });

  return { holdings, totals, byClass };
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
