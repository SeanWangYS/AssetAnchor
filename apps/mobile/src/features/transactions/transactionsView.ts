import {
  currencyPrefix,
  formatAmount as sharedFormatAmount,
  formatMoney as sharedFormatMoney,
  formatPrice as sharedFormatPrice,
  formatQuantity as sharedFormatQuantity,
  type Currency,
  type TransactionDocument,
} from '@assetanchor/shared';

/**
 * 交易顯示層（feature-local）。
 *
 * ⚠️ adapter only——格式規則的唯一實作點在 `packages/shared` format 模組
 * （fix-display-formatting 規則表）；本檔僅保留簽名相容的委派，**禁止任何格式規則**。
 * 日期分組邏輯（groupByMonth）仍屬本 feature。
 */

/**
 * 幣別顯示前綴（委派 shared 規則表）。
 * @deprecated 畫面改直接 import `currencyPrefix`（backlog：刪 shim）。
 */
export function currencySymbol(currency: Currency): string {
  return currencyPrefix(currency);
}

/**
 * 千分位金額（裸數字，依幣別小數位）。
 * @deprecated 畫面改直接 import shared `formatAmount`（backlog：刪 shim）。
 */
export function formatAmount(value: string, currency: Currency): string {
  return sharedFormatAmount(value, currency);
}

/**
 * 「NT$ 88,200」帶幣別前綴的完整金額字串。
 * @deprecated 畫面改直接 import shared `formatMoney`（backlog：刪 shim）。
 */
export function formatMoney(value: string, currency: Currency): string {
  return sharedFormatMoney(value, currency);
}

/**
 * 股數顯示（≤4 位去尾零 + 千分位）。保留 2-arg 簽名（消費端以 2 參數呼叫）；
 * 股數與幣別無關，currency 僅為相容而收、內部丟棄。
 * @deprecated 畫面改直接 import shared `formatQuantity`（backlog：刪 shim）。
 */
export function formatQuantity(value: string, _currency: Currency): string {
  return sharedFormatQuantity(value);
}

/**
 * 單價顯示：規則表「單價/均價一律 2 位」＋幣別前綴（visual-audit P2-2）。
 * @deprecated 畫面改直接 import shared `formatPrice`（backlog：刪 shim）。
 */
export function formatPrice(value: string, currency: Currency): string {
  return sharedFormatPrice(value, currency);
}

const MONTH_LABELS = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const;

export interface TransactionMonthGroup {
  /** 分組鍵（YYYY-MM）— 排序與 React key 用。 */
  key: string;
  /** 顯示標題（繁中月份 + 西元年，恆帶年）。 */
  label: string;
  items: TransactionDocument[];
}

/** 從 YYYY-MM-DD 取「日」（去前導零）。非法輸入回原字串末段。 */
export function dayOfMonth(date: string): string {
  const day = date.slice(8, 10);
  return day ? String(Number(day)) : date;
}

/**
 * 按月分組（版型 B：每月一個 header）。輸入假設已依 transaction_date desc 排序
 * （transactionsStore 的 query 已 orderBy desc）；本函式穩定保留該順序，僅切組。
 * 標題**恆帶西元年**（visual-audit P3-1：當年省略年會讓同畫面出現兩個「七月」）。
 */
export function groupByMonth(transactions: TransactionDocument[]): TransactionMonthGroup[] {
  const groups: TransactionMonthGroup[] = [];

  for (const t of transactions) {
    const ym = t.transaction_date.slice(0, 7); // YYYY-MM
    const last = groups[groups.length - 1];
    if (!last || last.key !== ym) {
      const year = Number(ym.slice(0, 4));
      const monthIdx = Number(ym.slice(5, 7)) - 1;
      const monthLabel = MONTH_LABELS[monthIdx] ?? ym;
      groups.push({ key: ym, label: `${monthLabel} · ${year}`, items: [t] });
    } else {
      last.items.push(t);
    }
  }
  return groups;
}
