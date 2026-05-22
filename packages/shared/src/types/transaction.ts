import type { AssetType } from '../enums/asset-types.js';
import type { TransactionType } from '../enums/transaction-types.js';
import type { Currency } from '../enums/currencies.js';
import type { Market } from '../enums/markets.js';
import type { FirestoreTimestamp } from './user.js';

export type RateSource = 'BOT' | 'EXCHANGERATE_HOST' | 'YAHOO' | null;
export type RateType = 'spot_sell' | 'spot_buy' | 'cash_sell' | 'cash_buy' | null;

export interface TransactionAmount {
  is_original: boolean;
  price: string;
  total: string;
  fee: string;
  tax: string;
  rate: string;
  rate_source: RateSource;
  rate_type: RateType;
  rate_date: string | null;
}

export type AmountsMap = Partial<Record<Currency, TransactionAmount>>;

export interface TransactionDocument {
  transaction_id: string;
  account_id: string;
  asset_type: AssetType;
  symbol: string;
  market: Market;
  transaction_type: TransactionType;
  transaction_date: string;
  ex_date: string | null;
  quantity: string;
  original_currency: Currency;
  amounts: AmountsMap;
  amounts_status: 'PENDING' | 'COMPLETE';
  related_transaction_id: string | null;
  lot_id: string | null;
  notes: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
