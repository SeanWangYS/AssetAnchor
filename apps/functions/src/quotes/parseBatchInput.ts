import { CURRENCIES, MARKETS, type Currency } from '@assetanchor/shared';

/** 批次報價單筆目標（market:symbol:currency）。 */
export interface BatchQuoteItem {
  market: string;
  symbol: string;
  currency: Currency;
}

export type ParseBatchResult = { ok: true; items: BatchQuoteItem[] } | { ok: false; msg: string };

/** 批次上限（防濫用 / URL 過長）。 */
export const MAX_BATCH_ITEMS = 50;

/**
 * 解析 `fetchQuotes` 的 query：`items=market:symbol:currency,market:symbol:currency,...`。
 * 純函式（可單元測試、不依賴 firebase）。逐筆驗證 MARKETS/CURRENCIES/symbol 非空；
 * **非法項剔除**（不整批失敗），symbol 去前後空白 + 大寫，重複 (market,symbol) 去重。
 * 全數非法（無有效項）或超過上限 → `ok:false`（handler 回 400）。
 */
export function parseBatchInput(q: Record<string, unknown>): ParseBatchResult {
  const raw = String(q.items ?? '').trim();
  if (!raw) return { ok: false, msg: 'items 必填（market:symbol:currency，逗號分隔）' };

  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > MAX_BATCH_ITEMS) {
    return { ok: false, msg: `items 過多（上限 ${MAX_BATCH_ITEMS}）` };
  }

  const items: BatchQuoteItem[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const [market = '', symbolRaw = '', currency = ''] = part.split(':');
    const symbol = symbolRaw.trim().toUpperCase();
    if (!(MARKETS as readonly string[]).includes(market) || !symbol) continue; // 剔除非法
    if (!(CURRENCIES as readonly string[]).includes(currency)) continue;
    const id = `${market}_${symbol}`;
    if (seen.has(id)) continue; // 去重
    seen.add(id);
    items.push({ market, symbol, currency: currency as Currency });
  }

  if (items.length === 0) return { ok: false, msg: '無有效項（market:symbol:currency）' };
  return { ok: true, items };
}
