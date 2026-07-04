import type { HistoryMarket } from '@assetanchor/shared';
import { parseYahooHistory, type HistoryBar } from './parseYahooHistory';

/** 盤中 timeframe（AssetDetail 1D/1W）→ Yahoo range/interval 對應（ADR-0010 D5）。 */
export const INTRADAY_PARAMS = Object.freeze({
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
} as const);

export type IntradayTf = keyof typeof INTRADAY_PARAMS;

/**
 * 歷史序列來源介面（ADR-0010：provider 可替換——台股 fallback 候選 TWSE 官方 API，
 * 本階段只留介面不實作）。fetch 失敗 / 粒度不符一律 fail loud（擲錯），由端點轉錯誤回應。
 */
export interface HistoryProvider {
  name: string;
  /** 日線：period1/period2（Unix 秒）視窗；回應粒度非 1d 即擲錯（防 Yahoo 靜默降級月線）。 */
  fetchDaily(
    market: HistoryMarket,
    symbol: string,
    period1Sec: number,
    period2Sec: number,
  ): Promise<HistoryBar[]>;
  /** 盤中：1D/1W 即抓即回，不落地。 */
  fetchIntraday(market: HistoryMarket, symbol: string, tf: IntradayTf): Promise<HistoryBar[]>;
}

/** market + symbol → Yahoo 歷史代號（台股 `.TW`；FX pseudo-symbol `USDTWD` → `TWD=X`）。 */
export function toYahooHistorySymbol(market: HistoryMarket, symbol: string): string {
  if (market === 'TW') return `${symbol}.TW`;
  if (market === 'FX') return symbol.startsWith('USD') ? `${symbol.slice(3)}=X` : `${symbol}=X`;
  return symbol;
}

/**
 * 誠實 UA，與既有 quotes provider 一致。實測（2026-07-04）：假冒完整 Chrome UA 會與
 * Node fetch 的 TLS 指紋不符、反而更容易被 Yahoo 429；平實 UA 穩定通過（ADR-0010）。
 */
const UA = 'Mozilla/5.0 (AssetAnchor)';

/** Yahoo chart 主機：query1 被 429 時輪替 query2（實測兩者限流獨立；ADR-0010 風險緩解）。 */
const YAHOO_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'] as const;

/** 打 Yahoo chart 並解析；`expectGranularity` 提供時驗證粒度（fail loud，不回髒資料）。 */
async function fetchChart(
  ySymbol: string,
  params: string,
  expectGranularity?: string,
): Promise<HistoryBar[]> {
  let res: Response | null = null;
  for (const host of YAHOO_HOSTS) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ySymbol)}?${params}`;
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status !== 429) break; // 只有限流才換主機；其他錯誤直接處理
  }
  if (res === null || !res.ok) {
    const status = res?.status ?? 0;
    const err = new Error(`Yahoo history fetch 失敗：HTTP ${status}（${ySymbol}）`);
    (err as Error & { status?: number }).status = status;
    throw err;
  }
  const parsed = parseYahooHistory(await res.json());
  if (!parsed) throw new Error(`Yahoo history 解析失敗（${ySymbol}）`);
  if (expectGranularity !== undefined && parsed.granularity !== expectGranularity) {
    // Yahoo 對過長 range 會靜默降級（如 1mo）——寧可 fail loud 也不寫月線髒資料
    throw new Error(
      `Yahoo 回應粒度非 ${expectGranularity}（${ySymbol}：${parsed.granularity ?? 'unknown'}）`,
    );
  }
  return parsed.bars;
}

/** 有界 range bucket（禁 `max`——會被靜默降級月線）。 */
const RANGE_BUCKETS = [
  ['5d', 5],
  ['1mo', 31],
  ['3mo', 93],
  ['6mo', 186],
  ['1y', 366],
  ['2y', 731],
  ['5y', 1827],
  ['10y', 3653],
] as const;

/** 需求天數 → 最小涵蓋的有界 range bucket（超過 10 年以 10y 為上限，MVP 邊界）。 */
export function rangeBucketFor(days: number): string {
  for (const [range, cap] of RANGE_BUCKETS) {
    if (days <= cap) return range;
  }
  return '10y';
}

export const yahooHistoryProvider: HistoryProvider = {
  name: 'yahoo-finance',
  async fetchDaily(market, symbol, period1Sec, period2Sec) {
    const ySymbol = toYahooHistorySymbol(market, symbol);
    try {
      // 首選 period1/period2（精準視窗）；實測 429 限流對 period 型與 range 型分開計，
      // 故 429 時 fallback 有界 range bucket（多抓的較早 bars 一併落地，冪等無害）。
      return await fetchChart(
        ySymbol,
        `interval=1d&period1=${period1Sec}&period2=${period2Sec}`,
        '1d',
      );
    } catch (e) {
      if ((e as { status?: number }).status !== 429) throw e;
      const days = Math.max(1, Math.ceil((period2Sec - period1Sec) / 86_400));
      return fetchChart(ySymbol, `interval=1d&range=${rangeBucketFor(days)}`, '1d');
    }
  },
  fetchIntraday(market, symbol, tf) {
    const { range, interval } = INTRADAY_PARAMS[tf];
    return fetchChart(toYahooHistorySymbol(market, symbol), `interval=${interval}&range=${range}`);
  },
};
