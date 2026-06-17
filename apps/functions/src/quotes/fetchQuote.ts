import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CURRENCIES, MARKETS, isFresh, sanitizeQuote, type Currency } from '@assetanchor/shared';
import { yahooProvider, type QuoteProvider } from './yahooProvider';

const REGION = 'asia-east1';

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

interface FetchQuoteInput {
  market: string;
  symbol: string;
  currency: Currency;
}

/** 驗證 callable 輸入（擋亂打）。 */
function parseInput(data: unknown): FetchQuoteInput {
  const d = (data ?? {}) as Record<string, unknown>;
  const market = String(d.market ?? '');
  const symbol = String(d.symbol ?? '').trim();
  const currency = String(d.currency ?? '');
  if (!(MARKETS as readonly string[]).includes(market) || !symbol) {
    throw new HttpsError('invalid-argument', 'market/symbol 必填且需合法');
  }
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    throw new HttpsError('invalid-argument', 'currency 需合法');
  }
  return { market, symbol, currency: currency as Currency };
}

/**
 * 取得報價：cache 新鮮（<15min）直接回；否則經 provider 抓 → sanitize → 寫 quotes/{symbolId}。
 * 報價 schema 見 planning §6；金額以 Money 10 位小數 string（sanitizeQuote 已正規化）。
 * 髒資料（sanitize 失敗）fail loud（HttpsError）——不寫半套、不放行（ADR-0007 §5b）。
 */
export async function getOrFetchQuote(
  input: FetchQuoteInput,
  provider: QuoteProvider,
  nowMs: number,
): Promise<{ symbolId: string; price: string; fetchedAtMs: number; cached: boolean }> {
  ensureApp();
  const { market, symbol, currency } = input;
  const symbolId = `${market}_${symbol}`;
  const ref = getFirestore().collection('quotes').doc(symbolId);

  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data();
    const fetchedAtMs: number =
      typeof data?.fetched_at?.toMillis === 'function' ? data.fetched_at.toMillis() : 0;
    if (isFresh(fetchedAtMs, nowMs)) {
      return { symbolId, price: String(data?.price ?? ''), fetchedAtMs, cached: true };
    }
  }

  const raw = await provider.fetch(market, symbol);
  const sane = sanitizeQuote(raw, currency);
  if (!sane.ok) {
    throw new HttpsError('internal', `報價未通過 sanity（${sane.reason}）：${symbolId}`);
  }
  const srcMs = raw.sourceTimestampSec ? raw.sourceTimestampSec * 1000 : nowMs;

  await ref.set({
    symbol_id: symbolId,
    symbol,
    market,
    currency,
    price: sane.value.price,
    fetched_at: FieldValue.serverTimestamp(),
    source: provider.name,
    source_timestamp: Timestamp.fromMillis(srcMs),
    is_delayed: true,
    delay_minutes: 15,
    open: sane.value.open,
    high: sane.value.high,
    low: sane.value.low,
    prev_close: sane.value.prevClose,
    volume: sane.value.volume,
  });

  return { symbolId, price: sane.value.price, fetchedAtMs: nowMs, cached: false };
}

/**
 * Callable `fetchQuote`：mobile 於 cache miss/過期時呼叫，觸發後端抓取並寫入共用 quotes cache。
 * 僅寫公開的 `quotes`（rules：登入可讀、只有後端可寫），不碰使用者資料。
 */
export const fetchQuote = onCall({ region: REGION }, async (request) => {
  const input = parseInput(request.data);
  try {
    return await getOrFetchQuote(input, yahooProvider, Date.now());
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error('fetchQuote failed', { input, error: String(e) });
    throw new HttpsError('unavailable', '報價暫時無法取得');
  }
});
