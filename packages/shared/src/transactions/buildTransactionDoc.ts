import { Money } from '../money/index.js';
import type { TransactionInput } from '../schemas/transaction.js';
import type { AmountsMap, TransactionAmount, TransactionDocument } from '../types/transaction.js';

/** 純 builder 的回傳：完整交易文件，但不含由 I/O 層補上的 serverTimestamp 欄位。 */
export type NewTransactionDoc = Omit<TransactionDocument, 'created_at' | 'updated_at'>;

/**
 * 從驗證後的表單輸入組出交易文件主體（ADR-0007「純轉換」seam）。
 *
 * 純函式、deterministic、不依賴 Firestore：時戳由 `writeTransaction` 在 I/O 層補。
 * 單幣別 BUY：`amounts` 只有原幣別一筆、`rate=1`、`amounts_status="COMPLETE"`
 * （多幣別 FX 為 Sprint 4）。金額/數量一律經 `Money` 轉 10 位小數 string，禁 native float。
 */
export function buildTransactionDoc(
  input: TransactionInput,
  ctx: { transactionId: string },
): NewTransactionDoc {
  const currency = input.original_currency;

  const price = new Money(input.price, currency);
  const fee = new Money(input.fee, currency);
  const tax = new Money(input.tax, currency);
  const total = price.multiply(input.quantity);
  const quantity = new Money(input.quantity, currency).toDecimalString();

  const amount: TransactionAmount = {
    is_original: true,
    price: price.toDecimalString(),
    total: total.toDecimalString(),
    fee: fee.toDecimalString(),
    tax: tax.toDecimalString(),
    rate: new Money('1', currency).toDecimalString(),
    rate_source: null,
    rate_type: null,
    rate_date: null,
  };

  const amounts: AmountsMap = {};
  amounts[currency] = amount;

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
    original_currency: currency,
    amounts,
    amounts_status: 'COMPLETE',
    related_transaction_id: null,
    lot_id: null,
    notes: input.notes,
  };
}
