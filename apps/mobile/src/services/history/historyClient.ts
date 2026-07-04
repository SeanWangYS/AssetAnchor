import type { Currency, HistoryMarket } from '@assetanchor/shared';

/**
 * ensureHistory / fetchIntraday 的純 helper（可測、不依賴 firebase）。
 * 對齊 quotesBatch.ts 的「純 URL 組裝 / 回應解析」慣例。
 */

/** 歷史序列單筆目標；`from`＝該 symbol 最早交易日（lazy backfill 起點，ADR-0010）。 */
export interface HistoryTarget {
  market: HistoryMarket;
  symbol: string;
  currency: Currency;
  from: string;
}

export function historyKeyOf(market: HistoryMarket, symbol: string): string {
  return `${market}_${symbol}`;
}

/** 組 ensureHistory URL：`?items=market:symbol:currency:from,...`。 */
export function buildEnsureHistoryUrl(base: string, targets: readonly HistoryTarget[]): string {
  const items = targets.map((t) => `${t.market}:${t.symbol}:${t.currency}:${t.from}`).join(',');
  return `${base}/ensureHistory?items=${encodeURIComponent(items)}`;
}

/** 解析 ensureHistory 回應 → `symbolId → lastDate`（error 筆 / 缺 lastDate 筆略過）。 */
export function parseEnsureHistoryResponse(json: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!json || typeof json !== 'object') return out;
  const j = json as { ok?: boolean; results?: unknown };
  if (!j.ok || !Array.isArray(j.results)) return out;
  for (const raw of j.results) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { symbolId?: string; lastDate?: string | null; error?: string };
    if (!item.symbolId || item.error || typeof item.lastDate !== 'string') continue;
    out[item.symbolId] = item.lastDate;
  }
  return out;
}

/** 組 fetchIntraday URL（1D/1W 盤中粒度，即抓即回不落地）。 */
export function buildFetchIntradayUrl(
  base: string,
  target: { market: HistoryMarket; symbol: string; currency: Currency },
  tf: '1D' | '1W',
): string {
  const q = `market=${encodeURIComponent(target.market)}&symbol=${encodeURIComponent(
    target.symbol,
  )}&currency=${encodeURIComponent(target.currency)}&tf=${tf}`;
  return `${base}/fetchIntraday?${q}`;
}

/** 解析 fetchIntraday 回應 → 依時間排序的 close string 序列（無效筆略過）。 */
export function parseIntradayResponse(json: unknown): { ts: number; close: string }[] {
  if (!json || typeof json !== 'object') return [];
  const j = json as { ok?: boolean; points?: unknown };
  if (!j.ok || !Array.isArray(j.points)) return [];
  const out: { ts: number; close: string }[] = [];
  for (const raw of j.points) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as { ts?: number; close?: string };
    if (typeof p.ts !== 'number' || typeof p.close !== 'string' || !p.close) continue;
    out.push({ ts: p.ts, close: p.close });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

/** `from` 日期起到今年（含）需要讀的年度分塊清單。 */
export function yearsFor(from: string, todayYear: number): number[] {
  const fromYear = Number(from.slice(0, 4));
  if (!Number.isFinite(fromYear) || fromYear > todayYear) return [todayYear];
  const years: number[] = [];
  for (let y = fromYear; y <= todayYear; y += 1) years.push(y);
  return years;
}
