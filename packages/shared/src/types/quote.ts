import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

export interface QuoteDocument {
  symbol_id: string;
  symbol: string;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  currency: Currency;
  price: string;
  fetched_at: FirestoreTimestamp;
  source: string;
  source_timestamp: FirestoreTimestamp;
  is_delayed: boolean;
  delay_minutes: number;
  open: string;
  high: string;
  low: string;
  prev_close: string;
  volume: string;
}
