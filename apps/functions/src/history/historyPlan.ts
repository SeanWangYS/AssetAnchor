import { Money, type Currency, type HistoryMarket } from '@assetanchor/shared';
import { localDateOf, type HistoryBar } from './parseYahooHistory';

/** 增量回看視窗（append + 假日/來源缺洞修補，冪等；Ghostfolio 模式，ADR-0010）。 */
export const LOOKBACK_DAYS = 7;

/** 各 market 的「今天」判定時區（no-op 決策用；bar 日期本身用 Yahoo meta 時區）。 */
export function marketTimezone(market: HistoryMarket): string {
  switch (market) {
    case 'TW':
      return 'Asia/Taipei';
    case 'US':
      return 'America/New_York';
    default:
      return 'UTC'; // FX（近 24/5）與其他市場保守用 UTC
  }
}

/** 最近一個「預期交易日」：平日回當天、週末回上週五（不處理國定假日——由 7 天回看吸收）。 */
export function latestExpectedTradingDay(todayLocal: string): string {
  const [y = 0, m = 0, d = 0] = todayLocal.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const back = dow === 6 ? 1 : dow === 0 ? 2 : 0;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

function dateToEpochSec(date: string): number {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 1000);
}

function minusDays(date: string, days: number): string {
  const [y = 0, m = 0, d = 0] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

/**
 * 決定是否需要打 Yahoo 及抓取視窗。回 null＝已涵蓋最近預期交易日（no-op）。
 * 視窗＝`[max(from, last_date − LOOKBACK_DAYS), now]`；無 last_date（首次回補）自 from 全抓。
 */
export function computeFetchWindow(opts: {
  lastDate: string | null;
  from: string;
  nowMs: number;
  market: HistoryMarket;
}): { period1Sec: number; period2Sec: number } | null {
  const todayLocal = localDateOf(opts.nowMs, marketTimezone(opts.market));
  if (opts.lastDate !== null && opts.lastDate >= latestExpectedTradingDay(todayLocal)) return null;

  const start =
    opts.lastDate === null
      ? opts.from
      : ((lookback) => (lookback > opts.from ? lookback : opts.from))(
          minusDays(opts.lastDate, LOOKBACK_DAYS),
        );
  return { period1Sec: dateToEpochSec(start), period2Sec: Math.floor(opts.nowMs / 1000) };
}

export interface YearChunkPayload {
  closes: Record<string, string>;
  adjcloses: Record<string, string>;
  last_date: string;
}

/**
 * bars → 年度分塊 upsert payload。close 須有限且 > 0（sanity，對齊 sanitizeQuote 哲學），
 * 否則整 bar 略過（缺日由消費端 forward-fill）；adjclose 僅在有效時寫入。
 * 數值以 `Money` 正規化為 10 位小數 string（ADR-0005 canonical）。
 */
export function chunkBarsByYear(
  bars: readonly HistoryBar[],
  currency: Currency,
): Map<number, YearChunkPayload> {
  const chunks = new Map<number, YearChunkPayload>();
  for (const bar of bars) {
    if (bar.close === null || !Number.isFinite(bar.close) || bar.close <= 0) continue;
    const year = Number(bar.date.slice(0, 4));
    let chunk = chunks.get(year);
    if (chunk === undefined) {
      chunk = { closes: {}, adjcloses: {}, last_date: bar.date };
      chunks.set(year, chunk);
    }
    chunk.closes[bar.date] = new Money(bar.close, currency).toDecimalString();
    if (bar.adjclose !== null && Number.isFinite(bar.adjclose) && bar.adjclose > 0) {
      chunk.adjcloses[bar.date] = new Money(bar.adjclose, currency).toDecimalString();
    }
    if (bar.date > chunk.last_date) chunk.last_date = bar.date;
  }
  return chunks;
}
