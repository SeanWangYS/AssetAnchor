import { Money } from '../money/index.js';
import type { TransactionInput } from '../schemas/transaction.js';
import type { TransactionDocument } from '../types/transaction.js';

/** 純 builder 的回傳：完整交易文件，但不含由 I/O 層補上的 serverTimestamp 欄位。 */
export type NewTransactionDoc = Omit<TransactionDocument, 'created_at' | 'updated_at'>;

/**
 * 從驗證後的表單輸入組出交易文件主體（ADR-0007「純轉換」seam）。
 *
 * 純函式、deterministic、不依賴 Firestore：時戳由 `writeTransaction` 在 I/O 層補。
 * 單幣別事件（ADR-0005）：只記市場原幣別 `currency` 的 flat 金額欄位，不做任何
 * FX 換算、不寫 amounts map。`total = price × quantity`（成交金額，不含 fee/tax）。
 * 金額/數量一律經 `Money` 轉 10 位小數 string，禁 native float。
 */
export function buildTransactionDoc(
  input: TransactionInput,
  ctx: { transactionId: string },
): NewTransactionDoc {
  const currency = input.currency;

  const price = new Money(input.price, currency);
  const fee = new Money(input.fee, currency);
  const tax = new Money(input.tax, currency);
  const total = price.multiply(input.quantity);
  const quantity = new Money(input.quantity, currency).toDecimalString();

  return {
    transaction_id: ctx.transactionId,
    account_id: input.account_id,
    asset_type: input.asset_type,
    symbol: input.symbol,
    market: input.market,
    transaction_type: input.transaction_type,
    transaction_date: input.transaction_date,
    ex_date: null,
    quantity,
    currency,
    price: price.toDecimalString(),
    total: total.toDecimalString(),
    fee: fee.toDecimalString(),
    tax: tax.toDecimalString(),
    related_transaction_id: null,
    lot_id: null,
    notes: input.notes,
  };
}
