import {
  CURRENCIES,
  HISTORY_MARKETS,
  type Currency,
  type HistoryMarket,
} from '@assetanchor/shared';

/** ensureHistory 單筆目標（market:symbol:currency:from；from＝該 symbol 最早交易日）。 */
export interface HistoryItem {
  market: HistoryMarket;
  symbol: string;
  currency: Currency;
  from: string;
}

export type ParseHistoryResult = { ok: true; items: HistoryItem[] } | { ok: false; msg: string };

/** 批次上限（對齊 fetchQuotes 的防濫用慣例）。 */
export const MAX_HISTORY_ITEMS = 50;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 解析 `ensureHistory` 的 query：`items=market:symbol:currency:from,...`。
 * 純函式；market 值域為 HISTORY_MARKETS（含 FX pseudo-symbol）。逐筆驗證，
 * 非法項剔除（不整批失敗）、(market,symbol) 去重；全數非法或超上限 → ok:false。
 */
export function parseHistoryInput(q: Record<string, unknown>): ParseHistoryResult {
  const raw = String(q.items ?? '').trim();
  if (!raw) return { ok: false, msg: 'items 必填（market:symbol:currency:from，逗號分隔）' };

  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > MAX_HISTORY_ITEMS) {
    return { ok: false, msg: `items 過多（上限 ${MAX_HISTORY_ITEMS}）` };
  }

  const items: HistoryItem[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const [market = '', symbolRaw = '', currency = '', from = ''] = part.split(':');
    const symbol = symbolRaw.trim().toUpperCase();
    if (!(HISTORY_MARKETS as readonly string[]).includes(market) || !symbol) continue;
    if (!(CURRENCIES as readonly string[]).includes(currency)) continue;
    if (!DATE_RE.test(from)) continue;
    const id = `${market}_${symbol}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      market: market as HistoryMarket,
      symbol,
      currency: currency as Currency,
      from,
    });
  }

  if (items.length === 0) return { ok: false, msg: '無有效項（market:symbol:currency:from）' };
  return { ok: true, items };
}
