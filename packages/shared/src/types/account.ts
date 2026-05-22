import type { Broker } from '../enums/brokers.js';
import type { AccountType } from '../enums/account-types.js';
import type { Currency } from '../enums/currencies.js';
import type { Market } from '../enums/markets.js';
import type { FirestoreTimestamp } from './user.js';

/**
 * cash_balances 用 Currency → string map。string 為 decimal.js 序列化值，
 * 小數第 10 位精度（見 planning doc §6）。
 */
export type CashBalances = Partial<Record<Currency, string>>;

export interface AccountDocument {
  account_id: string;
  account_name: string;
  broker: Broker;
  account_type: AccountType;
  base_currency: Currency;
  market: Market;
  cash_balances: CashBalances;
  cash_balances_updated_at: FirestoreTimestamp;
  is_active: boolean;
  display_order: number;
  color: string;
  notes: string;
  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}
