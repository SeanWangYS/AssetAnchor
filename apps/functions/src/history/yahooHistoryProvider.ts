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

/** 帶瀏覽器 UA（2025 起 Yahoo 對非瀏覽器 UA 更積極擋，ADR-0010 研究）。 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** 打 Yahoo chart 並解析；`expectGranularity` 提供時驗證粒度（fail loud，不回髒資料）。 */
async function fetchChart(
  ySymbol: string,
  params: string,
  expectGranularity?: string,
): Promise<HistoryBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?${params}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    const err = new Error(`Yahoo history fetch 失敗：HTTP ${res.status}（${ySymbol}）`);
    (err as Error & { status?: number }).status = res.status;
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

export const yahooHistoryProvider: HistoryProvider = {
  name: 'yahoo-finance',
  fetchDaily(market, symbol, period1Sec, period2Sec) {
    return fetchChart(
      toYahooHistorySymbol(market, symbol),
      `interval=1d&period1=${period1Sec}&period2=${period2Sec}`,
      '1d',
    );
  },
  fetchIntraday(market, symbol, tf) {
    const { range, interval } = INTRADAY_PARAMS[tf];
    return fetchChart(toYahooHistorySymbol(market, symbol), `interval=${interval}&range=${range}`);
  },
};
