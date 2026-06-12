import { Money } from '../money/index.js';
import type { Currency } from '../enums/currencies.js';
import type { Market } from '../enums/markets.js';
import type { TransactionDocument } from '../types/transaction.js';

/**
 * 由交易事件流推導出的單一持倉（ADR-0004：持倉是衍生資料，不落地）。
 * 跨帳戶以 (market, symbol) 聚合；金額/數量皆為 Money 10 位小數 string。
 */
export interface Position {
  market: Market;
  symbol: string;
  /** 原幣別（單幣別 MVP：台股 TWD、美股 USD）。 */
  currency: Currency;
  quantity: string;
  /** 總成本 = Σtotal + Σfee + Σtax（§4：手續費與交易稅計入成本基礎）。 */
  totalCost: string;
  /** 加權平均成本 = totalCost / quantity（ROUND_HALF_UP）。 */
  averageCost: string;
  txCount: number;
}

interface Accumulator {
  market: Market;
  symbol: string;
  quantity: Money;
  totalCost: Money;
  txCount: number;
}

/**
 * 從 TransactionDocument[] 動態推導持倉（純函式、deterministic）。
 *
 * MVP 僅聚合 BUY（SELL 與持有週期為 Sprint 5）。同一 (market, symbol) 出現
 * 混幣別時由 Money 丟 CurrencyMismatchError——資料異常必須 fail loud，
 * 不得靜默混算（ADR-0007）。
 */
export function deriveHoldings(transactions: TransactionDocument[]): Position[] {
  const acc = new Map<string, Accumulator>();

  for (const tx of transactions) {
    if (tx.transaction_type !== 'BUY') continue;

    const amount = tx.amounts[tx.original_currency];
    if (!amount) {
      throw new Error(
        `transaction ${tx.transaction_id} 缺少原幣別 amounts[${tx.original_currency}]`,
      );
    }

    const currency = tx.original_currency;
    const cost = Money.fromDecimalString(amount.total, currency)
      .add(Money.fromDecimalString(amount.fee, currency))
      .add(Money.fromDecimalString(amount.tax, currency));
    const quantity = Money.fromDecimalString(tx.quantity, currency);

    const key = `${tx.market}_${tx.symbol}`;
    const existing = acc.get(key);
    if (existing) {
      existing.quantity = existing.quantity.add(quantity);
      existing.totalCost = existing.totalCost.add(cost);
      existing.txCount += 1;
    } else {
      acc.set(key, {
        market: tx.market,
        symbol: tx.symbol,
        quantity,
        totalCost: cost,
        txCount: 1,
      });
    }
  }

  return [...acc.values()]
    .map((a) => ({
      market: a.market,
      symbol: a.symbol,
      currency: a.totalCost.currency,
      quantity: a.quantity.toDecimalString(),
      totalCost: a.totalCost.toDecimalString(),
      averageCost: a.totalCost.divide(a.quantity.toDecimalString()).toDecimalString(),
      txCount: a.txCount,
    }))
    .sort((p1, p2) =>
      p1.market === p2.market
        ? p1.symbol.localeCompare(p2.symbol)
        : p1.market.localeCompare(p2.market),
    );
}
