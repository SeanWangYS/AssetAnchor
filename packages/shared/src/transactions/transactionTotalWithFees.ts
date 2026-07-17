import { Money, toSafeDecimalString } from '../money/index.js';
import type { Currency } from '../enums/currencies.js';
import type { TransactionType } from '../enums/transaction-types.js';

/** `transactionTotalWithFees` 需要的交易欄位子集（`TransactionDocument` 的顯示口徑輸入）。 */
export interface TransactionTotalParts {
  /** MVP 僅 BUY/SELL 有意義：SELL 減 fee/tax、其餘型別一律加（與 deriveHoldings scan 的使用面一致）。 */
  transaction_type: TransactionType;
  /** 成交金額 = price × quantity（10 位小數 canonical string，不含 fee/tax）。 */
  total: string;
  fee: string;
  tax: string;
  currency: Currency;
}

/**
 * 交易總金額的**顯示口徑**（spec T3/T6：含手續費與稅；visual-audit P1-1）：
 * - BUY：`total + fee + tax`（總成本——實際付出的錢）
 * - SELL：`total − fee − tax`（總收入——實際拿回的錢；極端小額可為負，照實回傳）
 *
 * 與 `deriveHoldings`（持倉成本/賣出淨額）及交易表單「預估總成本」共用同一語意，
 * 使同一筆交易在清單、詳情、個股歷史、表單預估四處顯示一致。
 * Firestore `total` 欄位語意（成交金額）不變——本函式僅供顯示層與衍生計算。
 * 邊界（對齊 deriveHoldings / ADR-0007 §5b）：缺值（undefined/null，pre-ADR-0005 舊 doc）
 * fail-soft 視為 0；present-but-invalid 字串＝資料損毀，fail-loud 擲錯、不靜默歸零。
 */
export function transactionTotalWithFees(tx: TransactionTotalParts): string {
  const total = Money.fromDecimalString(toSafeDecimalString(tx.total), tx.currency);
  const fee = Money.fromDecimalString(toSafeDecimalString(tx.fee), tx.currency);
  const tax = Money.fromDecimalString(toSafeDecimalString(tx.tax), tx.currency);
  const result =
    tx.transaction_type === 'SELL' ? total.subtract(fee).subtract(tax) : total.add(fee).add(tax);
  return result.toDecimalString();
}
