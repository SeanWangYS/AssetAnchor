import type { Currency } from '../enums/currencies.js';
import type { Market } from '../enums/markets.js';
import type { FirestoreTimestamp } from './user.js';

/**
 * price_history 的 market 維度：交易域的 `Market` 之外多一個 `'FX'`
 * （匯率 pseudo-symbol，如 `FX_USDTWD`＝Yahoo `TWD=X`）。
 * 刻意不動 `Market` enum——交易/帳戶域不存在 FX 資產。
 */
export type HistoryMarket = Market | 'FX';

/**
 * `price_history/{symbolId}_{year}` — per-symbol per-year 分塊的日線收盤序列
 * （ADR-0010 架構 B）。價格為 Money 10 位小數 string（ADR-0005 canonical）；
 * `closes`/`adjcloses` key 為 `YYYY-MM-DD`（僅含實際交易日，缺日由消費端
 * forward-fill）。登入者可讀、只有 Cloud Function（Admin SDK）可寫。
 */
export interface PriceHistoryDocument {
  /** 同 quotes 的 id 慣例：`TW_2330` / `US_AAPL` / `FX_USDTWD`。 */
  symbol_id: string;
  market: HistoryMarket;
  symbol: string;
  /** 序列計價幣別（TW→TWD、US→USD、FX_USDTWD→TWD）。 */
  currency: Currency;
  /** 分塊年份，同 doc id 後綴。 */
  year: number;
  /** 日線收盤：`YYYY-MM-DD` → Money 10 位小數 string。 */
  closes: Record<string, string>;
  /** 還原收盤（除權/分割還原），本階段僅落地不消費。 */
  adjcloses: Record<string, string>;
  /** 該 doc 已涵蓋的最後日期（增量起點查詢用，免掃 map）。 */
  last_date: string;
  /** provider 名（同 quotes 慣例，如 `yahoo-finance`）。 */
  source: string;
  updated_at: FirestoreTimestamp;
}
