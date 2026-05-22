import type { FirestoreTimestamp } from './user.js';

/**
 * Key 格式：{FROM}_{TO} 例如 "TWD_USD"。
 * 同 doc 可預存買賣 variant，例如 TWD_USD_buy / TWD_USD_cash_sell。
 */
export type RateMap = Record<string, string>;

export interface ExchangeRateDocument {
  date: string;
  source: 'BOT' | 'EXCHANGERATE_HOST' | 'YAHOO';
  rates: RateMap;
  fetched_at: FirestoreTimestamp;
  is_estimated: boolean;
}
