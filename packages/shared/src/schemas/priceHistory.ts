import { z } from 'zod';
import { MARKETS } from '../enums/markets.js';
import { CURRENCIES } from '../enums/currencies.js';

/** `YYYY-MM-DD`（closes/adjcloses 的 key 與 last_date）。 */
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** price_history 的 market 值域＝交易域 MARKETS + 'FX'（見 types/price-history.ts）。 */
export const HISTORY_MARKETS = Object.freeze([...MARKETS, 'FX'] as const);

/**
 * `price_history/{symbolId}_{year}` 讀取邊界驗證（mobile 消費端 fail-soft 用）。
 * `updated_at`（FirestoreTimestamp）不在此驗證——讀取端不消費該欄位。
 */
export const priceHistoryDocumentSchema = z.object({
  symbol_id: z.string().min(1),
  market: z.enum(HISTORY_MARKETS),
  symbol: z.string().min(1),
  currency: z.enum(CURRENCIES),
  year: z.number().int(),
  closes: z.record(z.string().regex(DATE_KEY), z.string().min(1)),
  adjcloses: z.record(z.string().regex(DATE_KEY), z.string().min(1)),
  last_date: z.string().regex(DATE_KEY),
  source: z.string(),
});
