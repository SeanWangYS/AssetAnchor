import { create } from 'zustand';
import { isRealDate } from '@assetanchor/shared';
import type { TransactionDocument } from '@assetanchor/shared';

/**
 * 期間篩選狀態（transactions-page-spec T5）—— feature-local。
 *
 * DateRange sheet（Root modal route）與 TransactionList 不在同一 navigator 層，
 * 直接以 callback 當 navigation param 會觸發 non-serializable 警告；故用輕量
 * feature-local store 共享選取的期間。preset / 區間判斷為純函式可單元測試。
 *
 * 自訂起訖（custom）：起訖為 YYYY-MM-DD（fix-visual-audit-p0p1 實作，原 Phase 2 佔位）。
 * 過濾含起訖當日（ISO 字串比較；transaction_date 由 schema 保證格式）。
 * custom 但起訖缺失/非法時為**防禦性視同 all**——正常流程不會發生（sheet 端擋套用）。
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

/** 自訂起訖區間（YYYY-MM-DD；空字串 = 未填）。 */
export interface CustomRange {
  start: string;
  end: string;
}

const EMPTY_RANGE: CustomRange = { start: '', end: '' };

interface DateRangeState {
  preset: DateRangePreset;
  /** custom 專用起訖；preset 非 custom 時保留最後輸入（重開 sheet 回填用）。 */
  custom: CustomRange;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (range: CustomRange) => void;
  reset: () => void;
}

export const useDateRangeStore = create<DateRangeState>((set) => ({
  preset: 'all',
  custom: EMPTY_RANGE,
  setPreset: (preset) => set({ preset }),
  setCustomRange: (custom) => set({ preset: 'custom', custom }),
  reset: () => set({ preset: 'all', custom: EMPTY_RANGE }),
}));

/** YYYY-MM 字串（依本機今天）。 */
function thisYearMonth(now: Date): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** 起訖是否為「可套用」的合法區間：雙欄皆真實日期且起 ≤ 訖。 */
export function isValidCustomRange(range: CustomRange): boolean {
  return isRealDate(range.start) && isRealDate(range.end) && range.start <= range.end;
}

/**
 * 純函式：某交易是否落在區間內（以 transaction_date 的 YYYY-MM-DD 判斷）。
 * - all：全收
 * - month：當年當月
 * - last3m：近三個自然月（含本月，往前推 2 個月起）
 * - ytd：今年
 * - custom：`start ≤ date ≤ end`（含當日，ISO 字典序＝時序）；區間非法時防禦性全收
 */
export function inRange(
  date: string,
  preset: DateRangePreset,
  now: Date = new Date(),
  custom: CustomRange = EMPTY_RANGE,
): boolean {
  if (preset === 'all') return true;
  if (preset === 'custom') {
    if (!isValidCustomRange(custom)) return true;
    return custom.start <= date && date <= custom.end;
  }

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

/** 套用 preset / 自訂區間過濾交易清單（純函式）。 */
export function filterByPreset(
  transactions: TransactionDocument[],
  preset: DateRangePreset,
  now: Date = new Date(),
  custom: CustomRange = EMPTY_RANGE,
): TransactionDocument[] {
  if (preset === 'all') return transactions;
  if (preset === 'custom' && !isValidCustomRange(custom)) return transactions;
  return transactions.filter((t) => inRange(t.transaction_date, preset, now, custom));
}

/** pill 顯示用：custom 顯示實際區間（「M/D–M/D」），其餘用 preset label。 */
export function presetDisplayLabel(preset: DateRangePreset, custom: CustomRange): string {
  if (preset !== 'custom' || !isValidCustomRange(custom)) return PRESET_LABEL[preset];
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return `${md(custom.start)}–${md(custom.end)}`;
}
