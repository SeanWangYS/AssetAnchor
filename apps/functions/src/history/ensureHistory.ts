import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { computeFetchWindow, chunkBarsByYear } from './historyPlan';
import { runEnsureBatch, type EnsureResult } from './ensureBatch';
import { parseHistoryInput, type HistoryItem } from './parseHistoryInput';
import { yahooHistoryProvider, type HistoryProvider } from './yahooHistoryProvider';
import { USER_HTTP_OPTIONS } from '../runtimeOptions';

/** 對 Yahoo 的請求間隔（少量、有禮貌——2025 起 429 收緊，ADR-0010）。 */
const THROTTLE_MS = 1_000;
/** 429 退避後重試一次的等待。 */
const BACKOFF_MS = 2_000;
/**
 * Stop starting new items after 50 s. Worst case for one started item is ~66 s
 * (≤ 8 Yahoo requests × 8 s abort timeout + 2 s backoff), so 50 + 66 < 120 s timeout.
 */
const BATCH_BUDGET_MS = 50_000;

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 讀該 symbol 已落地的最後日期：查今年與去年兩個年度 doc（doc id 決定性，免 collection query）。 */
async function readLastDate(symbolId: string, nowMs: number): Promise<string | null> {
  const db = getFirestore();
  const year = new Date(nowMs).getUTCFullYear();
  for (const y of [year, year - 1]) {
    const snap = await db.collection('price_history').doc(`${symbolId}_${y}`).get();
    const last = snap.exists ? (snap.get('last_date') as unknown) : undefined;
    if (typeof last === 'string' && last) return last;
  }
  return null; // 超過一年沒開 app 也走首次回補路徑（冪等 upsert，只是多抓）
}

/**
 * 單一 symbol 的 lazy 增量：last_date 已涵蓋最近預期交易日 → no-op；否則
 * 自 `max(from, last_date−7d)` 抓到現在（7 天回看 upsert，冪等），依年份分塊寫入
 * `price_history/{symbolId}_{year}`。429 退避後重試一次。純 I/O 核心，可 emulator 測。
 */
export async function ensureHistoryFor(
  item: HistoryItem,
  provider: HistoryProvider,
  nowMs: number,
): Promise<EnsureResult> {
  ensureApp();
  const symbolId = `${item.market}_${item.symbol}`;
  const lastDate = await readLastDate(symbolId, nowMs);
  const window = computeFetchWindow({ lastDate, from: item.from, nowMs, market: item.market });
  if (window === null) return { symbolId, lastDate, cached: true };

  let bars;
  try {
    bars = await provider.fetchDaily(
      item.market,
      item.symbol,
      window.period1Sec,
      window.period2Sec,
    );
  } catch (e) {
    if ((e as { status?: number }).status !== 429) throw e;
    await sleep(BACKOFF_MS); // 429：退避後重試一次，再失敗交由呼叫端隔離
    bars = await provider.fetchDaily(
      item.market,
      item.symbol,
      window.period1Sec,
      window.period2Sec,
    );
  }

  const chunks = chunkBarsByYear(bars, item.currency);
  const db = getFirestore();
  let newest = lastDate;
  for (const [year, payload] of chunks) {
    await db.collection('price_history').doc(`${symbolId}_${year}`).set(
      {
        symbol_id: symbolId,
        market: item.market,
        symbol: item.symbol,
        currency: item.currency,
        year,
        closes: payload.closes,
        adjcloses: payload.adjcloses,
        last_date: payload.last_date,
        source: provider.name,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }, // map 欄位深合併：既有日期保留、新日期併入
    );
    if (newest === null || payload.last_date > newest) newest = payload.last_date;
  }
  return { symbolId, lastDate: newest, cached: false };
}

/**
 * HTTP `ensureHistory` (GET ?items=market:symbol:currency:from,...): lazy incremental
 * daily history triggered when charts open (ADR-0010 D4). Per-item error isolation,
 * ≥1 s between real Yahoo requests, and a 50 s batch budget inside a 120 s timeout
 * (items past the budget come back deferred). The data itself is not returned — the
 * client reads Firestore (single read path).
 */
export const ensureHistory = onRequest(
  { ...USER_HTTP_OPTIONS, timeoutSeconds: 120 },
  async (req, res) => {
    const parsed = parseHistoryInput(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ ok: false, error: parsed.msg });
      return;
    }
    const nowMs = Date.now();
    const results = await runEnsureBatch(parsed.items, {
      ensureOne: (item) => ensureHistoryFor(item, yahooHistoryProvider, nowMs),
      now: Date.now,
      sleep,
      budgetMs: BATCH_BUDGET_MS,
      throttleMs: THROTTLE_MS,
      onError: (item, error) =>
        logger.error('ensureHistory item failed', { item, error: String(error) }),
    });
    res.json({ ok: true, results });
  },
);
