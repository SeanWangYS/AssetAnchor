import {
  Money,
  convertMoney,
  type Currency,
  type Market,
  type Position,
  type RateMap,
} from '@assetanchor/shared';

/**
 * 持倉總覽 / 詳情的「報價層」demo 資料（align-to-design-package WP-A）。
 *
 * ⚠️ 真實報價（市值、今日漲跌）為 Sprint 5（Non-goal of this change）。本檔提供
 * deterministic 的 mock 報價乘數與走勢序列，讓 B 儀表板在無 quotes collection 時
 * 仍可完整 demo（對齊 prototype 全 mock 的視覺定稿）。
 *
 * 真實資料（股數 / 加權均價 / 總成本 / 幣別）一律來自 `useHoldings()`（deriveHoldings），
 * 本檔只補「需要報價才能算」的欄位，並由畫面以「資料延遲」字樣標示為示意。
 */

/** demo 匯率 fallback：1 USD = 30.95 TWD（design §5；rates 未就緒時用）。 */
export const DEMO_USD_TWD = '30.95';

/** 跨幣別合計的顯示幣別（MVP 預設 TWD；Settings 切換為 Sprint 6）。 */
export const DISPLAY_CURRENCY: Currency = 'TWD';

/** 標的中文名 / 英文名（prototype HOLD 對照；未知標的回退代號本身）。 */
interface SymbolMeta {
  name: string;
  en: string;
  /** 帳戶分布顯示名（單一帳戶 demo；真實多帳戶分布為後續）。 */
  account: string;
}

const SYMBOL_META: Record<string, SymbolMeta> = {
  '2330': { name: '台積電', en: 'TSMC', account: '群益證券' },
  '2317': { name: '鴻海', en: 'Hon Hai', account: '群益證券' },
  '0050': { name: '元大台灣50', en: 'Yuanta TW Top50', account: '富邦證券' },
  '00878': { name: '國泰永續高股息', en: 'Cathay Sustainability', account: '富邦證券' },
  AAPL: { name: 'Apple', en: 'Apple Inc.', account: 'Firstrade' },
  VTI: { name: 'Vanguard Total', en: 'Total Stock Market', account: 'Interactive Brokers' },
  QQQ: { name: 'Invesco QQQ', en: 'Nasdaq-100 ETF', account: 'Firstrade' },
};

export function symbolMeta(symbol: string): SymbolMeta {
  return SYMBOL_META[symbol] ?? { name: symbol, en: symbol, account: '—' };
}

export function marketLabel(market: Market): string {
  if (market === 'TW') return '台股';
  if (market === 'US') return '美股';
  if (market === 'CRYPTO') return '加密貨幣';
  return '其他';
}

/** 標的固定圓標底色（prototype `av`；未知標的回退 accent，由呼叫端帶預設）。 */
const AVATAR_COLOR: Record<string, string> = {
  '2330': '#1F8A5B',
  '2317': '#16785C',
  '0050': '#B23B3B',
  '00878': '#C08A2E',
  AAPL: '#222831',
  VTI: '#2E62D6',
  QQQ: '#5B43C0',
};

export function avatarColor(symbol: string, fallback: string): string {
  return AVATAR_COLOR[symbol] ?? fallback;
}

/**
 * deterministic mock 報酬率（%）—— 由代號字元碼產生穩定值（−6%~+24%），
 * 純為了讓無報價時的市值 / 漲跌% 看起來可信。實作報價後整段移除。
 */
function seed(symbol: string): number {
  let s = 0;
  for (let i = 0; i < symbol.length; i++) s = (s * 31 + symbol.charCodeAt(i)) % 1000;
  return s;
}

/** 總報酬率%（mock）。 */
export function mockReturnPct(symbol: string): number {
  return Math.round((((seed(symbol) % 300) - 60) / 10) * 100) / 100;
}

/** 今日漲跌%（mock，−2%~+3.5%）。 */
export function mockTodayPct(symbol: string): number {
  return Math.round(((((seed(symbol) * 7) % 550) - 200) / 100) * 100) / 100;
}

/**
 * mock 市值（原幣別）：總成本 × (1 + mockReturnPct/100)。
 * 真實報價接上後改為 quantity × latestQuote。
 */
export function mockMarketValue(position: Position): Money {
  const cost = Money.fromDecimalString(position.totalCost, position.currency);
  const factor = 1 + mockReturnPct(position.symbol) / 100;
  return cost.multiply(factor.toFixed(6));
}

/** mock 未實現損益（原幣別）= 市值 − 成本。 */
export function mockUnrealized(position: Position): Money {
  return mockMarketValue(position).subtract(
    Money.fromDecimalString(position.totalCost, position.currency),
  );
}

/** mock 現價（原幣別）= 市值 / 股數。 */
export function mockPrice(position: Position): Money {
  const qty = Money.fromDecimalString(position.quantity, position.currency);
  if (qty.isZero()) return Money.zero(position.currency);
  return mockMarketValue(position).divide(position.quantity);
}

/**
 * 把原幣別 Money 換算成目標幣別供「合計」用：rates 優先，否則退 demo 匯率。
 * 同幣別免換算。只有 TWD/USD 互換有 demo fallback；其餘缺率回 null。
 */
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

/** 幣別前綴（NT$ / US$）。 */
export function currencyPrefix(currency: Currency): string {
  return currency === 'USD' ? 'US$' : 'NT$';
}

/** 顯示小數位：USD 2 位、TWD 0 位（對齊 prototype nf 慣例）。 */
export function displayDecimals(currency: Currency): number {
  return currency === 'USD' ? 2 : 0;
}

/** 金額顯示字（含千分位、依幣別小數位；不含正負號 / 前綴）。 */
export function fmtAmount(amount: Money, currency: Currency): string {
  return amount.toNumber().toLocaleString('en-US', {
    minimumFractionDigits: displayDecimals(currency),
    maximumFractionDigits: displayDecimals(currency),
  });
}

/** 帶前綴金額（NT$ 1,238,540 / US$ 1,712.88）。 */
export function fmtMoney(amount: Money, currency: Currency): string {
  return `${currencyPrefix(currency)} ${fmtAmount(amount, currency)}`;
}

/** 股數顯示（整數股不帶小數、零股保留小數）。 */
export function fmtShares(quantity: string, currency: Currency): string {
  return Money.fromDecimalString(quantity, currency).toNumber().toLocaleString('en-US');
}

/**
 * 走勢圖假序列（prototype SERIES；無真實歷史 → 第二階段接報價）。
 * 各 timeframe 一條遞增折線，數字僅供畫面完整。
 */
export const DEMO_SERIES: Record<string, readonly number[]> = {
  '1D': [52, 51, 53, 52, 54, 53, 55, 54, 56, 58, 57, 59, 58, 60, 59, 61],
  '1W': [40, 44, 42, 48, 46, 52, 50, 55, 53, 58, 60, 57, 62, 66, 64, 68],
  '1M': [30, 34, 32, 40, 38, 44, 50, 46, 54, 58, 55, 64, 62, 70, 68, 74],
  '3M': [22, 28, 26, 38, 34, 46, 42, 56, 52, 64, 60, 72, 68, 78, 74, 82],
  YTD: [18, 24, 30, 28, 40, 38, 52, 48, 62, 58, 72, 68, 80, 78, 86, 90],
  '1Y': [12, 20, 16, 30, 26, 42, 38, 54, 48, 66, 60, 78, 72, 86, 82, 94],
  ALL: [6, 14, 22, 18, 34, 30, 48, 44, 62, 58, 76, 70, 86, 82, 92, 98],
};

/** 持倉總覽 hero / bento 的整體 mock 摘要（TWD；prototype SUM）。需報價，故為示意。 */
export const DEMO_SUMMARY = {
  /** 總資產 TWD。 */
  totalAssets: 1238540,
  /** 總報酬率 %。 */
  totalReturnPct: 7.66,
  /** 總未實現損益 TWD。 */
  unrealized: 88200,
  /** 今日損益 TWD。 */
  today: 3420,
  /** 今日損益 %。 */
  todayPct: 0.28,
  /** 本月已實現損益 TWD。 */
  realizedThisMonth: 12400,
} as const;
