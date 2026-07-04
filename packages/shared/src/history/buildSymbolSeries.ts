/** price_history 年度分塊的最小輸入形狀（PriceHistoryDocument 子集，方便測試與跨端使用）。 */
export interface HistoryChunk {
  year: number;
  closes: Readonly<Record<string, string>>;
}

export interface SymbolSeriesPoint {
  date: string;
  /** Money 10 位小數 string（原幣別）。 */
  close: string;
}

/** 走勢圖日線 timeframe（`1D`/`1W` 為盤中粒度，不在此列，走 fetchIntraday）。 */
export type DailyTimeframe = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

/** 跨年度分塊合併為單一 `date → close` map。 */
export function mergeChunkCloses(chunks: readonly HistoryChunk[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const chunk of chunks) Object.assign(merged, chunk.closes);
  return merged;
}

/**
 * 年度分塊 → 排序日線點列，依 `[from, to]`（含端點，`YYYY-MM-DD` 字典序）切片。
 * from/to 省略或 null 表示該側無界。
 */
export function buildSymbolSeries(
  chunks: readonly HistoryChunk[],
  range: { from?: string | null; to?: string | null },
): SymbolSeriesPoint[] {
  const merged = mergeChunkCloses(chunks);
  const dates = Object.keys(merged).sort();
  const points: SymbolSeriesPoint[] = [];
  for (const date of dates) {
    if (range.from != null && date < range.from) continue;
    if (range.to != null && date > range.to) continue;
    const close = merged[date];
    if (close !== undefined) points.push({ date, close });
  }
  return points;
}

/** `YYYY-MM-DD` 回推 n 個月；目標月較短時 clamp 到該月最後一天（3/31 − 1M → 2/28）。 */
function subtractMonths(date: string, months: number): string {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  const targetMonthIndex = m - 1 - months; // 0-based，可為負（跨年由 Date 正規化）
  const lastDay = new Date(Date.UTC(y, targetMonthIndex + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(y, targetMonthIndex, Math.min(d, lastDay)));
  return result.toISOString().slice(0, 10);
}

/**
 * timeframe → 序列起始日（`ALL`＝最早交易日；無交易回 null 表示無下界）。
 * `today` 由呼叫端提供（純函式，不讀系統時鐘）。
 */
export function timeframeStart(
  tf: DailyTimeframe,
  today: string,
  earliestTxDate: string | null,
): string | null {
  switch (tf) {
    case '1M':
      return subtractMonths(today, 1);
    case '3M':
      return subtractMonths(today, 3);
    case '1Y':
      return subtractMonths(today, 12);
    case 'YTD':
      return `${today.slice(0, 4)}-01-01`;
    case 'ALL':
      return earliestTxDate;
  }
}
