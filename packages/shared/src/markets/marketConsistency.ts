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

/**
 * 表單「選市場自動帶幣別」的預設值（enable-crypto-quotes design D5）：
 * 與硬擋（expectedCurrencyForMarket）分離——CRYPTO 預設 USD 但允許 USDT/TWD，
 * 故不能放進硬擋函式。OTHER 回 null（表單不動）。
 */
export function defaultCurrencyForMarket(market: Market): Currency | null {
  if (market === 'CRYPTO') return 'USD';
  return expectedCurrencyForMarket(market);
}

/**
 * CRYPTO 市場的交易幣別允許集（enable-crypto-quotes）：報價幣別恆 USD（symbol.currency），
 * 交易/記帳幣別限 USD / USDT / TWD；USDT 換算基準 1:1 釘 USD（peg 寫在 functions 匯率層）。
 */
export const CRYPTO_TRANSACTION_CURRENCIES = Object.freeze(['USD', 'USDT', 'TWD'] as const);

/**
 * 報價幣別（enable-crypto-quotes design D9）：由**市場**決定、與交易/記帳幣別分離——
 * TW→TWD、US→USD、CRYPTO→恆 USD（Yahoo ticker 恆 `-USD`）；OTHER 無市場級約定，
 * 沿用呼叫端 fallback（通常為 position/交易幣別）。quotes 文件與估值定價一律用本函式。
 */
export function quoteCurrencyForMarket(market: Market, fallback: Currency): Currency {
  if (market === 'CRYPTO') return 'USD';
  return expectedCurrencyForMarket(market) ?? fallback;
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
