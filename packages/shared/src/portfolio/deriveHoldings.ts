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
  /** 總成本 = 持有部位的成本基礎（賣出後依加權平均等比遞減）。 */
  totalCost: string;
  /** 加權平均成本 = totalCost / quantity（ROUND_HALF_UP）；賣出不改變。 */
  averageCost: string;
  txCount: number;
  /** 該 (market, symbol) 全期已實現損益（原幣別 10 位小數 string；無賣出為 0）。 */
  realizedPnl: string;
}

/** 單筆賣出的已實現損益事件（§4）；時序輸出，供 per-symbol 加總與區間/跨幣別合計用。 */
export interface RealizedEvent {
  market: Market;
  symbol: string;
  currency: Currency;
  transaction_date: string;
  /** (total − fee − tax) − averageCost × soldQty，賣出當下均價。 */
  realized: string;
}

interface Lot {
  market: Market;
  symbol: string;
  currency: Currency;
  quantity: Money;
  totalCost: Money;
  realized: Money;
  txCount: number;
}

interface ScanResult {
  lots: Map<string, Lot>;
  events: RealizedEvent[];
}

/** 依 `transaction_date`（YYYY-MM-DD，字典序＝時序）穩定排序；同日保留輸入順序。 */
function chronological(transactions: TransactionDocument[]): TransactionDocument[] {
  return transactions
    .map((tx, i) => [tx, i] as const)
    .sort((a, b) =>
      a[0].transaction_date === b[0].transaction_date
        ? a[1] - b[1]
        : a[0].transaction_date.localeCompare(b[0].transaction_date),
    )
    .map(([tx]) => tx);
}

/**
 * 單趟時序掃描：累積每個 (market, symbol) 的持有量/成本/已實現，並逐筆 SELL 產生已實現事件。
 * BUY：量與成本累加；SELL：均價不變，成本依 avgCost×soldQty 等比遞減、已實現入帳。
 * 全數賣出後量與成本歸零 → 後續 BUY 視為新週期（§4）。超賣 fail loud（ADR-0007）。
 * 同一 (market, symbol) 混幣別由 Money 運算丟 CurrencyMismatchError。
 */
function scan(transactions: TransactionDocument[]): ScanResult {
  const lots = new Map<string, Lot>();
  const events: RealizedEvent[] = [];

  for (const tx of chronological(transactions)) {
    if (tx.transaction_type !== 'BUY' && tx.transaction_type !== 'SELL') continue;

    const currency = tx.currency;
    const key = `${tx.market}_${tx.symbol}`;
    const qty = Money.fromDecimalString(tx.quantity, currency);

    let lot = lots.get(key);
    if (!lot) {
      lot = {
        market: tx.market,
        symbol: tx.symbol,
        currency,
        quantity: Money.zero(currency),
        totalCost: Money.zero(currency),
        realized: Money.zero(currency),
        txCount: 0,
      };
      lots.set(key, lot);
    }
    lot.txCount += 1;

    if (tx.transaction_type === 'BUY') {
      const cost = Money.fromDecimalString(tx.total, currency)
        .add(Money.fromDecimalString(tx.fee, currency))
        .add(Money.fromDecimalString(tx.tax, currency));
      lot.quantity = lot.quantity.add(qty);
      lot.totalCost = lot.totalCost.add(cost);
    } else {
      // SELL：超賣 fail loud
      if (qty.compareTo(lot.quantity) > 0) {
        throw new Error(
          `oversell: ${key} sold ${tx.quantity} exceeds held ${lot.quantity.toDecimalString()}`,
        );
      }
      const avgCost = lot.quantity.isZero()
        ? Money.zero(currency)
        : lot.totalCost.divide(lot.quantity.toDecimalString());
      const proceeds = Money.fromDecimalString(tx.total, currency)
        .subtract(Money.fromDecimalString(tx.fee, currency))
        .subtract(Money.fromDecimalString(tx.tax, currency));
      const costOfSold = avgCost.multiply(tx.quantity);
      const realized = proceeds.subtract(costOfSold);

      lot.realized = lot.realized.add(realized);
      lot.quantity = lot.quantity.subtract(qty);
      lot.totalCost = lot.totalCost.subtract(costOfSold);

      events.push({
        market: tx.market,
        symbol: tx.symbol,
        currency,
        transaction_date: tx.transaction_date,
        realized: realized.toDecimalString(),
      });
    }
  }

  return { lots, events };
}

/**
 * 從 TransactionDocument[] 動態推導**當前**持倉（純函式、deterministic）。
 * 處理 BUY/SELL（時序），全數賣出（qty=0）之 (market, symbol) **不**列入（非當前持倉）。
 */
export function deriveHoldings(transactions: TransactionDocument[]): Position[] {
  const { lots } = scan(transactions);

  return [...lots.values()]
    .filter((lot) => !lot.quantity.isZero())
    .map((lot) => ({
      market: lot.market,
      symbol: lot.symbol,
      currency: lot.currency,
      quantity: lot.quantity.toDecimalString(),
      totalCost: lot.totalCost.toDecimalString(),
      averageCost: lot.totalCost.divide(lot.quantity.toDecimalString()).toDecimalString(),
      txCount: lot.txCount,
      realizedPnl: lot.realized.toDecimalString(),
    }))
    .sort((p1, p2) =>
      p1.market === p2.market
        ? p1.symbol.localeCompare(p2.symbol)
        : p1.market.localeCompare(p2.market),
    );
}

/** 從交易事件流推導每筆 SELL 的已實現損益事件（時序，§4）。純函式。 */
export function deriveRealizedEvents(transactions: TransactionDocument[]): RealizedEvent[] {
  return scan(transactions).events;
}

/**
 * 某 (market, symbol) 當下可賣股數（= 目前持有股數；無持倉回 "0.0000000000"）。
 * 供 SELL 表單做「不可超賣」驗證的單一事實來源。
 */
export function sellableQuantity(
  transactions: TransactionDocument[],
  market: Market,
  symbol: string,
): string {
  const pos = deriveHoldings(transactions).find((p) => p.market === market && p.symbol === symbol);
  return pos ? pos.quantity : '0.0000000000';
}
