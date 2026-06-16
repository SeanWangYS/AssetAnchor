import { Money, type Currency, type TransactionDocument } from '@assetanchor/shared';

/**
 * 交易顯示層純函式（feature-local）。
 *
 * 設計稿（transactions-page-spec §4）原規劃把「日期分組邏輯」放 `packages/shared`，
 * 但本 WP 只准動 `features/transactions/**`（不可改 shared）。故暫置於此 feature-local
 * 模組；待後續 sprint 再抽到 shared 並補單元測試（見回報 flag）。
 *
 * 金額一律經 `Money`（ADR-0005 單幣別事件：交易只記原幣別、顯示不換算）。
 * native number 僅用於 `Pnl` 的正負判斷（不參與金額運算）。
 */

/** 幣別顯示前綴（§5：NT$ / US$）。 */
export function currencySymbol(currency: Currency): string {
  return currency === 'USD' ? 'US$' : currency === 'TWD' ? 'NT$' : currency;
}

/** 顯示小數位：USD 2 位、TWD 整數（對齊 prototype txFmt）。 */
function displayDecimals(currency: Currency): number {
  return currency === 'USD' ? 2 : 0;
}

/** 千分位（整數部分）；小數位依幣別。輸入為 Money 10 位小數 canonical string。 */
export function formatAmount(value: string, currency: Currency): string {
  const fixed = Money.fromDecimalString(value, currency).toDisplayString(displayDecimals(currency));
  const [intPart = '0', frac] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

/** 「NT$ 88,200」帶幣別前綴的完整金額字串。 */
export function formatMoney(value: string, currency: Currency): string {
  return `${currencySymbol(currency)} ${formatAmount(value, currency)}`;
}

/** 股數顯示：整數不帶小數、含千分位（價格類精度交給 formatAmount）。 */
export function formatQuantity(value: string, currency: Currency): string {
  const n = Money.fromDecimalString(value, currency);
  // 股數通常為整數；有小數時最多顯示到 4 位（去尾零）。
  const raw = n.toDisplayString(4);
  const trimmed = raw.replace(/\.?0+$/, '');
  const [intPart = '0', frac] = trimmed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * 單價顯示：有小數→2 位、整數→0 位（對齊 prototype `t.px % 1 ? 2 : 0`），帶幣別前綴。
 * e.g. 台股 1100 → 「NT$ 1,100」；美股 214.1 → 「US$ 214.10」。
 */
export function formatPrice(value: string, currency: Currency): string {
  const m = Money.fromDecimalString(value, currency);
  const isInteger = m.equals(Money.fromDecimalString(m.toDisplayString(0), currency));
  const fixed = m.toDisplayString(isInteger ? 0 : 2);
  const [intPart = '0', frac] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
  return `${currencySymbol(currency)} ${body}`;
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
  /** 顯示標題（繁中月份；跨年時帶西元年）。 */
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
 * 跨年時 label 帶西元年（如「12月 · 2025」），避免不同年同月混淆。
 */
export function groupByMonth(transactions: TransactionDocument[]): TransactionMonthGroup[] {
  const groups: TransactionMonthGroup[] = [];
  const currentYear = new Date().getFullYear();

  for (const t of transactions) {
    const ym = t.transaction_date.slice(0, 7); // YYYY-MM
    const last = groups[groups.length - 1];
    if (!last || last.key !== ym) {
      const year = Number(ym.slice(0, 4));
      const monthIdx = Number(ym.slice(5, 7)) - 1;
      const monthLabel = MONTH_LABELS[monthIdx] ?? ym;
      const label = year === currentYear ? monthLabel : `${monthLabel} · ${year}`;
      groups.push({ key: ym, label, items: [t] });
    } else {
      last.items.push(t);
    }
  }
  return groups;
}
