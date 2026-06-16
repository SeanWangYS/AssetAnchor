import { create } from 'zustand';
import type { TransactionDocument } from '@assetanchor/shared';

/**
 * 期間篩選狀態（transactions-page-spec T5）—— feature-local。
 *
 * DateRange sheet（Root modal route）與 TransactionList 不在同一 navigator 層，
 * 直接以 callback 當 navigation param 會觸發 non-serializable 警告；故用輕量
 * feature-local store 共享選取的期間。preset 為純函式可單元測試。
 *
 * 自訂起訖（custom）為 Phase 2 待辦（spec §5），此處先佔位：UI 顯示但套用時
 * 退回「全部」（見回報 flag）。
 */
export type DateRangePreset = 'all' | 'month' | 'last3m' | 'ytd' | 'custom';

export const PRESET_LABEL: Record<DateRangePreset, string> = {
  all: '全部',
  month: '本月',
  last3m: '近三月',
  ytd: '今年',
  custom: '自訂',
};

/** preset 顯示順序（自訂單獨呈現於起訖欄）。 */
export const PRESET_ORDER: DateRangePreset[] = ['all', 'month', 'last3m', 'ytd'];

interface DateRangeState {
  preset: DateRangePreset;
  setPreset: (preset: DateRangePreset) => void;
  reset: () => void;
}

export const useDateRangeStore = create<DateRangeState>((set) => ({
  preset: 'all',
  setPreset: (preset) => set({ preset }),
  reset: () => set({ preset: 'all' }),
}));

/** YYYY-MM 字串（依本機今天）。 */
function thisYearMonth(now: Date): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * 純函式：某交易是否落在 preset 區間內（以 transaction_date 的 YYYY-MM-DD 判斷）。
 * - all：全收
 * - month：當年當月
 * - last3m：近三個自然月（含本月，往前推 2 個月起）
 * - ytd / custom：今年（custom 尚未實作，暫等同 all → 由 caller 决定；此處回 true）
 */
export function inRange(date: string, preset: DateRangePreset, now: Date = new Date()): boolean {
  if (preset === 'all' || preset === 'custom') return true;

  const { year, month } = thisYearMonth(now);
  const ty = Number(date.slice(0, 4));
  const tm = Number(date.slice(5, 7));
  if (Number.isNaN(ty) || Number.isNaN(tm)) return false;

  if (preset === 'ytd') return ty === year;
  if (preset === 'month') return ty === year && tm === month;
  if (preset === 'last3m') {
    // 本月與前兩個月：以「年*12+月」線性化後比較區間（跨年正確）。
    const cur = year * 12 + month;
    const target = ty * 12 + tm;
    return target <= cur && target >= cur - 2;
  }
  return true;
}

/** 套用 preset 過濾交易清單（純函式）。 */
export function filterByPreset(
  transactions: TransactionDocument[],
  preset: DateRangePreset,
  now: Date = new Date(),
): TransactionDocument[] {
  if (preset === 'all' || preset === 'custom') return transactions;
  return transactions.filter((t) => inRange(t.transaction_date, preset, now));
}
