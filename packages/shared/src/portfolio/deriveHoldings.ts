import { Money, toSafeDecimalString } from '../money/index.js';
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
 * 單趟時序掃描：累積每個 (market, symbol, currency) 的持有量/成本/已實現，並逐筆 SELL 產生已實現事件。
 * BUY：量與成本累加；SELL：均價不變，成本依 avgCost×soldQty 等比遞減、已實現入帳。
 * 全數賣出後量與成本歸零 → 後續 BUY 視為新週期（§4）。超賣 fail loud（ADR-0007）。
 * 同標的不同交易幣別為**獨立 lot**（enable-crypto-quotes design D7：混幣別記帳不擲錯，
 * Money 運算永不跨幣別；SELL 只沖銷同幣別 lot）。
 */
function scan(transactions: TransactionDocument[]): ScanResult {
  const lots = new Map<string, Lot>();
  const events: RealizedEvent[] = [];

  for (const tx of chronological(transactions)) {
    if (tx.transaction_type !== 'BUY' && tx.transaction_type !== 'SELL') continue;

    const currency = tx.currency;
    const key = `${tx.market}_${tx.symbol}_${currency}`;
    // 缺欄位 fail-soft（pre-ADR-0005 舊 doc 可能缺值）：缺/非法視為 0，不丟 DecimalError。
    const safeQty = toSafeDecimalString(tx.quantity);
    const qty = Money.fromDecimalString(safeQty, currency);

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
      const cost = Money.fromDecimalString(toSafeDecimalString(tx.total), currency)
        .add(Money.fromDecimalString(toSafeDecimalString(tx.fee), currency))
        .add(Money.fromDecimalString(toSafeDecimalString(tx.tax), currency));
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
      const proceeds = Money.fromDecimalString(toSafeDecimalString(tx.total), currency)
        .subtract(Money.fromDecimalString(toSafeDecimalString(tx.fee), currency))
        .subtract(Money.fromDecimalString(toSafeDecimalString(tx.tax), currency));
      const costOfSold = avgCost.multiply(safeQty);
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
 * 處理 BUY/SELL（時序），全數賣出（qty=0）之 lot **不**列入（非當前持倉）。
 * 同標的混幣別記帳 → 每幣別各一筆 position（D7；同 market/symbol 依 currency 排序穩定）。
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
    .sort((p1, p2) => {
      if (p1.market !== p2.market) return p1.market.localeCompare(p2.market);
      if (p1.symbol !== p2.symbol) return p1.symbol.localeCompare(p2.symbol);
      return p1.currency.localeCompare(p2.currency);
    });
}

/** 從交易事件流推導每筆 SELL 的已實現損益事件（時序，§4）。純函式。 */
export function deriveRealizedEvents(transactions: TransactionDocument[]): RealizedEvent[] {
  return scan(transactions).events;
}

/**
 * 某 (market, symbol, currency) 當下可賣股數（= 目前同幣別 lot 持有股數；無持倉回 "0.0000000000"）。
 * SELL 只沖銷同幣別 lot（D7）——幣別選錯時可賣 0，由既有不可超賣驗證自然擋下。
 * 供 SELL 表單做「不可超賣」驗證的單一事實來源。
 */
export function sellableQuantity(
  transactions: TransactionDocument[],
  market: Market,
  symbol: string,
  currency: Currency,
): string {
  const pos = deriveHoldings(transactions).find(
    (p) => p.market === market && p.symbol === symbol && p.currency === currency,
  );
  return pos ? pos.quantity : '0.0000000000';
}

/**
 * 某**帳戶**（account_id）之 (market, symbol) 當下可賣股數。
 * 券商帳戶為真實帳戶：你只能賣「在該帳戶」持有的股，同 symbol 於他帳戶的持倉不計入。
 * 內部以 account_id 過濾交易子集後沿用 `deriveHoldings`（同一事實來源），無持倉回 "0.0000000000"。
 * 供 SELL 表單做「帳戶層級不可超賣」驗證。
 */
export function sellableQuantityForAccount(
  transactions: TransactionDocument[],
  accountId: string,
  market: Market,
  symbol: string,
  currency: Currency,
): string {
  return sellableQuantity(
    transactions.filter((t) => t.account_id === accountId),
    market,
    symbol,
    currency,
  );
}

/** `deriveHoldingsForAccountSafe` 跳過的 (market, symbol)（因歷史爛資料致 throw）。 */
export interface SkippedSymbol {
  market: Market;
  symbol: string;
}

/** `deriveHoldingsForAccountSafe` 回傳：合法持倉 + 被跳過（資料異常）的 symbol 清單。 */
export interface SafeHoldingsResult {
  positions: Position[];
  skipped: SkippedSymbol[];
}

/**
 * 某帳戶持倉的**逐-symbol 容錯**衍生（顯示層用）。
 *
 * 先以 account_id 過濾，再依 (market, symbol) 分組、逐組各自 `deriveHoldings`；
 * 單組 throw（如歷史爛資料造成的帳戶層級超賣 / orphan SELL / 混幣別）SHALL 只跳過該 symbol
 * 並收集到 `skipped` + log，其餘可正常推導的持股照常回傳——不得因單一 symbol 失敗整包消失。
 *
 * 無爛資料時，`positions` 與「整體 `deriveHoldings(該帳戶交易子集)`」一致且同序
 * （逐組結果合併後沿用 deriveHoldings 的 market asc / symbol asc 排序）。
 *
 * 注意：全域總覽（HoldingsOverview）仍呼叫原 `deriveHoldings`（fail-loud，ADR-0007）；
 * 本函式僅治理「帳戶層級」顯示容錯，不放寬全域語意。純函式。
 */
export function deriveHoldingsForAccountSafe(
  transactions: TransactionDocument[],
  accountId: string,
): SafeHoldingsResult {
  return safeHoldingsFromTxs(
    transactions.filter((t) => t.account_id === accountId),
    `account ${accountId}`,
  );
}

/**
 * **全域**持倉的逐-symbol 容錯衍生（enable-crypto-quotes design D8；HoldingsOverview /
 * Analysis 顯示層用）：單一 symbol 爛資料（超賣 / orphan SELL）只跳過該 symbol、收進
 * `skipped` + warn，**不得清空整個投資組合**。原 `deriveHoldings` 維持 fail-loud（ADR-0007）。
 */
export function deriveHoldingsSafe(transactions: TransactionDocument[]): SafeHoldingsResult {
  return safeHoldingsFromTxs(transactions, '總覽');
}

/**
 * 逐-(market, symbol) 容錯衍生（`deriveHoldingsForAccountSafe` 與 `deriveHoldingsByAccount`
 * 的共用核心）。傳入的 `txs` 已由呼叫端過濾（單一帳戶 / orphan 桶）；`label` 僅供 warn 訊息。
 * 單組 throw（超賣 / orphan SELL / 混幣別）只跳過該 symbol、收進 `skipped`，不整包消失。
 */
function safeHoldingsFromTxs(txs: TransactionDocument[], label: string): SafeHoldingsResult {
  // 依 (market, symbol) 分組，保留各組首見順序（最終結果由 deriveHoldings 重新排序）。
  const groups = new Map<string, { market: Market; symbol: string; txs: TransactionDocument[] }>();
  for (const tx of txs) {
    const key = `${tx.market}_${tx.symbol}`;
    let group = groups.get(key);
    if (!group) {
      group = { market: tx.market, symbol: tx.symbol, txs: [] };
      groups.set(key, group);
    }
    group.txs.push(tx);
  }

  const positions: Position[] = [];
  const skipped: SkippedSymbol[] = [];

  for (const group of groups.values()) {
    try {
      // 單組 derive：合法者貢獻 0 或 1 個 Position（全數賣出→0）。
      positions.push(...deriveHoldings(group.txs));
    } catch (err) {
      skipped.push({ market: group.market, symbol: group.symbol });
      console.warn(
        `[holdings] ${label} 之 ${group.market}_${group.symbol} 推導失敗，已跳過該 symbol：`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 合併後沿用 deriveHoldings 的排序規則（market asc, then symbol asc），確保與整體推導同序。
  positions.sort((p1, p2) =>
    p1.market === p2.market
      ? p1.symbol.localeCompare(p2.symbol)
      : p1.market.localeCompare(p2.market),
  );

  return { positions, skipped };
}

/** 帳戶最小識別資訊（`deriveHoldingsByAccount` 輸入；呼叫端傳完整 account doc 亦可，結構相容）。 */
export interface AccountRef {
  account_id: string;
  account_name: string;
}

/** 單一帳戶的持倉分組（持倉總覽「帳戶」模式用）。 */
export interface AccountHoldingsGroup {
  accountId: string;
  accountName: string;
  positions: Position[];
  skipped: SkippedSymbol[];
}

/**
 * 依**真實 `account_id`** 將持倉分組（持倉總覽「帳戶」模式）——取代 symbol→帳戶 demo 對照。
 *
 * 對每個帳戶各自以 `safeHoldingsFromTxs`（＝`deriveHoldingsForAccountSafe` 的核心）推導；
 * `account_id` 對不到任何現存帳戶的交易（orphan，如帳戶已刪）彙整成 `accountName: '未分類'`
 * 的群並殿後（fail-soft，不靜默消失）。只回傳「有持倉或有 skipped」的群（無交易的帳戶不成群）。
 * 群順序依傳入 `accounts` 的順序。純函式。
 */
export function deriveHoldingsByAccount(
  transactions: TransactionDocument[],
  accounts: readonly AccountRef[],
): AccountHoldingsGroup[] {
  const knownIds = new Set(accounts.map((a) => a.account_id));
  const result: AccountHoldingsGroup[] = [];

  for (const acct of accounts) {
    const { positions, skipped } = safeHoldingsFromTxs(
      transactions.filter((t) => t.account_id === acct.account_id),
      `account ${acct.account_id}`,
    );
    if (positions.length > 0 || skipped.length > 0) {
      result.push({
        accountId: acct.account_id,
        accountName: acct.account_name,
        positions,
        skipped,
      });
    }
  }

  // orphan：account_id 對不到任何現存帳戶 → 歸「未分類」，殿後。
  const orphanTxs = transactions.filter((t) => !knownIds.has(t.account_id));
  if (orphanTxs.length > 0) {
    const { positions, skipped } = safeHoldingsFromTxs(orphanTxs, '未分類');
    if (positions.length > 0 || skipped.length > 0) {
      result.push({ accountId: '', accountName: '未分類', positions, skipped });
    }
  }

  return result;
}
