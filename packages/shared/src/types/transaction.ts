import type { AssetType } from '../enums/asset-types.js';
import type { TransactionType } from '../enums/transaction-types.js';
import type { Currency } from '../enums/currencies.js';
import type { Market } from '../enums/markets.js';
import type { FirestoreTimestamp } from './user.js';

/**
 * 交易事件文件（ADR-0005：單幣別事件）。
 *
 * 交易只記市場原幣別（`currency`）的金額，**不**在事件內做 FX 換算、不存對稱
 * 多幣別 amounts map。跨幣別換算為顯示層職責，於檢視時用最新 `exchange_rates`
 * 即時計算（見 currency-display capability）。金額/數量一律 `Money` 10 位小數 string。
 */
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
  /** 市場原幣別（台股 TWD、美股 USD）。 */
  currency: Currency;
  /** 單價（Money 10 位小數 string）。 */
  price: string;
  /** 成交金額 = price × quantity（不含手續費與稅）。 */
  total: string;
  fee: string;
  tax: string;
  related_transaction_id: string | null;
  lot_id: string | null;
  notes: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
