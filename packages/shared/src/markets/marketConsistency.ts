import type { Market } from '../enums/markets.js';
import type { Currency } from '../enums/currencies.js';

/**
 * 市場×幣別一致性（guard-transaction-market-consistency）：
 * TW 市場證券一律 TWD 計價、US 市場一律 USD；CRYPTO/OTHER 不約束（回 null）。
 * 源起：production bug——台股 ETF 存成 market=US（幣別 TWD），Yahoo 404 → 永遠「報價載入中」。
 */
export function expectedCurrencyForMarket(market: Market): Currency | null {
  if (market === 'TW') return 'TWD';
  if (market === 'US') return 'USD';
  return null;
}

/** 台股樣式代號：數字開頭（0050、2330、00631L…）。 */
const TW_STYLE_RE = /^\d/;
/** 美股樣式代號：純英文字母（含 BRK.B 這類帶點的 class 股）。 */
const US_STYLE_RE = /^[A-Za-z]+(\.[A-Za-z]+)?$/;

/**
 * 代號樣式 vs 市場的啟發式檢查（**軟警告用**，不阻擋送出——啟發式有誤報可能）：
 * US 市場配台股樣式（數字開頭）、或 TW 市場配純英文字母 → true。
 * CRYPTO/OTHER 與空字串不判斷。
 */
export function symbolLooksLikeMarketMismatch(market: Market, symbol: string): boolean {
  const s = symbol.trim();
  if (s === '') return false;
  if (market === 'US') return TW_STYLE_RE.test(s);
  if (market === 'TW') return US_STYLE_RE.test(s);
  return false;
}
