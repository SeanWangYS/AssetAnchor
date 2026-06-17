import { onRequest } from 'firebase-functions/v2/https';
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

type ParseResult = { ok: true; input: FetchQuoteInput } | { ok: false; msg: string };

/** 驗證 query 參數（擋亂打）。 */
function parseInput(q: Record<string, unknown>): ParseResult {
  const market = String(q.market ?? '');
  const symbol = String(q.symbol ?? '')
    .trim()
    .toUpperCase();
  const currency = String(q.currency ?? '');
  if (!(MARKETS as readonly string[]).includes(market) || !symbol) {
    return { ok: false, msg: 'market/symbol 必填且需合法' };
  }
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, msg: 'currency 需合法' };
  }
  return { ok: true, input: { market, symbol, currency: currency as Currency } };
}

/**
 * 取得報價：cache 新鮮（<15min）直接回；否則經 provider 抓 → sanitize → 寫 quotes/{symbolId}。
 * 報價 schema 見 planning §6；金額以 Money 10 位小數 string（sanitizeQuote 已正規化）。
 * 髒資料（sanitize 失敗）fail loud（擲錯）——不寫半套、不放行（ADR-0007 §5b）。純 I/O 核心，可 emulator 測。
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
  if (!sane.ok) throw new Error(`報價未通過 sanity（${sane.reason}）：${symbolId}`);
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
 * HTTP `fetchQuote`（GET ?market=&symbol=&currency=）：mobile 於 cache miss/過期時以 `fetch()`
 * 觸發，後端抓取並寫入共用 quotes cache。採 onRequest（非 onCall）以免 mobile 需 RNFirebase
 * functions 原生模組——對齊既有 seedUsdRate 模式。僅寫公開 `quotes`（rules：登入可讀、後端可寫）。
 */
export const fetchQuote = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const parsed = parseInput(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.msg });
    return;
  }
  try {
    const r = await getOrFetchQuote(parsed.input, yahooProvider, Date.now());
    res.json({ ok: true, ...r });
  } catch (e) {
    logger.error('fetchQuote failed', { input: parsed.input, error: String(e) });
    res.status(502).json({ ok: false, error: '報價暫時無法取得' });
  }
});
