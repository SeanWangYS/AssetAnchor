import type { FirestoreTimestamp } from './user.js';

/** 匯率基準類型。MVP 只用 spot_sell（即期賣出）；其餘為第二階段預留。 */
export type RateType = 'spot_sell' | 'spot_buy' | 'cash_sell' | 'cash_buy';

/**
 * Key 格式：{FROM}_{TO}，例如 "USD_TWD"（1 USD = N TWD）。
 * MVP 預存雙向 USD_TWD / TWD_USD（互為倒數，省顯示層計算）。
 */
export type RateMap = Record<string, string>;

/**
 * 每日匯率文件（ADR-0005）。Document ID = 實際牌告日（`date`）。
 * 由後端 Cloud Function 以 Admin SDK 寫入（client 唯讀）；顯示層讀「最新一筆」。
 */
export interface ExchangeRateDocument {
  /** 牌告日 YYYY-MM-DD（= document id）。 */
  date: string;
  source: 'BOT' | 'EXCHANGERATE_HOST' | 'YAHOO';
  /** 匯率基準（MVP 恆 "spot_sell"）。 */
  rate_type: RateType;
  /** 至少含雙向 USD_TWD / TWD_USD，皆 Money 10 位小數 string。 */
  rates: RateMap;
  fetched_at: FirestoreTimestamp;
  /** 本模型以實際牌告日為 key，恆 false（欄位保留供未來估值情境）。 */
  is_estimated: boolean;
}
