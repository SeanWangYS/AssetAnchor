import { Money } from '../money/index.js';
import type { Currency } from '../enums/currencies.js';

/** Provider 抓回的原始報價（數字或字串；驗證前）。`QuoteDocument`（落地形狀）見 types/quote.ts。 */
export interface RawQuote {
  price: number | string;
  open?: number | string | null;
  high?: number | string | null;
  low?: number | string | null;
  prevClose?: number | string | null;
  volume?: number | string | null;
}

/** 驗證後的報價（金額皆 Money 10 位小數 string；缺值為 null）。 */
export interface SanitizedQuote {
  price: string;
  open: string | null;
  high: string | null;
  low: string | null;
  prevClose: string | null;
  volume: string | null;
}

export type SanitizeQuoteResult =
  | { ok: true; value: SanitizedQuote }
  | { ok: false; reason: 'invalid_price' | 'invalid_field' };

const QUOTE_TTL_MINUTES = 15;

/** 解析金額欄位為 Money string；非有限 / 無法解析回 undefined。 */
function toMoneyString(v: number | string, currency: Currency): string | undefined {
  try {
    return new Money(String(v), currency).toDecimalString();
  } catch {
    return undefined;
  }
}

/**
 * 報價邊界驗證（ADR-0007 §5b）：擋髒資料於進入系統前。純函式。
 * - price：必須有限且 > 0，否則 `invalid_price`。
 * - open/high/low/prevClose：缺值→null；存在則須有限且 ≥ 0，否則 `invalid_field`。
 * - volume：缺值→null；存在則須有限且 ≥ 0，否則 `invalid_field`。
 */
export function sanitizeQuote(raw: RawQuote, currency: Currency): SanitizeQuoteResult {
  const priceStr = toMoneyString(raw.price, currency);
  if (priceStr === undefined || !new Money(priceStr, currency).isPositive()) {
    return { ok: false, reason: 'invalid_price' };
  }

  const optional = (v: number | string | null | undefined): string | null | 'err' => {
    if (v === null || v === undefined) return null;
    const s = toMoneyString(v, currency);
    if (s === undefined || new Money(s, currency).isNegative()) return 'err';
    return s;
  };

  const open = optional(raw.open);
  const high = optional(raw.high);
  const low = optional(raw.low);
  const prevClose = optional(raw.prevClose);
  const volume = optional(raw.volume);
  if ([open, high, low, prevClose, volume].includes('err')) {
    return { ok: false, reason: 'invalid_field' };
  }

  return {
    ok: true,
    value: {
      price: priceStr,
      open: open as string | null,
      high: high as string | null,
      low: low as string | null,
      prevClose: prevClose as string | null,
      volume: volume as string | null,
    },
  };
}

/**
 * 報價是否仍新鮮（cache TTL）。未來時戳（clock skew / 髒資料）視為不新鮮。
 * 邊界含：剛好等於 TTL 視為新鮮。
 */
export function isFresh(
  fetchedAtMs: number,
  nowMs: number,
  ttlMinutes: number = QUOTE_TTL_MINUTES,
): boolean {
  if (fetchedAtMs > nowMs) return false;
  return nowMs - fetchedAtMs <= ttlMinutes * 60_000;
}
