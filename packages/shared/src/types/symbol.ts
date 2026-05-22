import type { AssetType } from '../enums/asset-types.js';
import type { Currency } from '../enums/currencies.js';
import type { FirestoreTimestamp } from './user.js';

export interface SymbolDocument {
  symbol_id: string;
  symbol: string;
  market: 'TW' | 'US' | 'CRYPTO' | 'OTHER';
  asset_type: AssetType;
  name: string;
  name_zh: string;
  currency: Currency;
  is_active: boolean;
  exchange: string;
  industry: string;
  sector: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
