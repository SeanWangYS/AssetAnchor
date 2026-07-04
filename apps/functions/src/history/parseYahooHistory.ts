/**
 * 解析 Yahoo Finance v8 chart「歷史序列」回應（純函式，可測；不打外網）。
 * 與 parseYahooChart（單點報價，只讀 meta）不同：本函式讀 timestamp[] ×
 * indicators.quote[0].close[] × indicators.adjclose[0].adjclose[]。
 * `granularity` 原樣帶出——呼叫端必須驗 `'1d'`（Yahoo 對 range=max 會靜默降級
 * 成月線，ADR-0010 研究實測）。null close 保留 null，交由消費端 forward-fill。
 */
export interface HistoryBar {
  /** bar 的 epoch 秒（交易所時區的收盤 bar 時間）。 */
  ts: number;
  /** 交易所時區換算的 `YYYY-MM-DD`。 */
  date: string;
  close: number | null;
  adjclose: number | null;
}

export interface ParsedYahooHistory {
  granularity: string | null;
  timezone: string | null;
  bars: HistoryBar[];
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** epoch 毫秒 → 指定時區的 `YYYY-MM-DD`；時區無效時退 UTC（防禦）。 */
export function localDateOf(ms: number, timezone: string): string {
  try {
    // en-CA locale 的日期格式即 YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

export function parseYahooHistory(json: unknown): ParsedYahooHistory | null {
  const result = (json as { chart?: { result?: unknown[] } })?.chart?.result;
  const first = Array.isArray(result)
    ? (result[0] as
        | {
            meta?: Record<string, unknown>;
            timestamp?: unknown[];
            indicators?: {
              quote?: { close?: unknown[] }[];
              adjclose?: { adjclose?: unknown[] }[];
            };
          }
        | undefined)
    : undefined;
  const meta = first?.meta;
  if (!meta) return null;

  const timezone = typeof meta.exchangeTimezoneName === 'string' ? meta.exchangeTimezoneName : null;
  const granularity = typeof meta.dataGranularity === 'string' ? meta.dataGranularity : null;

  const timestamps = Array.isArray(first?.timestamp) ? first.timestamp : [];
  const closes = first?.indicators?.quote?.[0]?.close ?? [];
  const adjcloses = first?.indicators?.adjclose?.[0]?.adjclose ?? [];

  const bars: HistoryBar[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = num(timestamps[i]);
    if (ts === null) continue;
    bars.push({
      ts,
      date: localDateOf(ts * 1000, timezone ?? 'UTC'),
      close: num(closes[i]),
      adjclose: num(adjcloses[i]),
    });
  }
  return { granularity, timezone, bars };
}
