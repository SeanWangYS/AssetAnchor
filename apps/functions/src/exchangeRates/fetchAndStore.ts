import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parseYahooFxRate } from './parseYahooFxRate';
import { buildDailyRates } from './buildDailyRates';

/**
 * 匯率源：Yahoo v8 chart `TWD=X`（1 USD = N TWD 市場價）。
 * 原台銀 CSV 源自 2026-06-30 起被全站 anti-bot JS challenge 擋死（fix-usd-rate-source）；
 * Yahoo 端點與報價層（ADR-0006/0010）同源同慣例（誠實 UA），production 已驗證。
 */
const YAHOO_FX_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/TWD%3DX?interval=1d&range=1d';
const REGION = 'asia-east1';

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

/**
 * 抓 Yahoo `TWD=X` → 解析最新市場價與資料日 → 以 Admin SDK upsert `exchange_rates/{資料日}`。
 *
 * 回傳寫入的資料日。idempotent（同資料日覆寫同一文件）。抓取/解析失敗一律 fail loud，
 * 不寫半套文件（ADR-0005 / design D4、D7）。匯率以 `Money` 序列化成 10 位小數 string。
 */
export async function fetchAndStoreUsdRate(): Promise<{ date: string }> {
  ensureApp();

  const res = await fetch(YAHOO_FX_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (AssetAnchor)' } });
  if (!res.ok) {
    throw new Error(`Yahoo FX fetch 失敗：HTTP ${res.status}`);
  }
  const { date, rate } = parseYahooFxRate(await res.json());

  await getFirestore()
    .collection('exchange_rates')
    .doc(date)
    .set({
      date,
      source: 'YAHOO',
      rate_type: 'market',
      // USD/TWD 雙向 + USDT 1:1 peg 四鍵（enable-crypto-quotes），皆 10 位小數 string。
      rates: buildDailyRates(rate),
      fetched_at: FieldValue.serverTimestamp(),
      is_estimated: false,
    });

  return { date };
}

/** 每日排程（Asia/Taipei 09:30；外匯近全天候，取當下最新市場價，design D4）。 */
export const scheduledUsdRate = onSchedule(
  { schedule: '30 9 * * *', timeZone: 'Asia/Taipei', region: REGION },
  async () => {
    const r = await fetchAndStoreUsdRate();
    logger.info('exchange rate stored', r);
  },
);

/**
 * 手動觸發端點（emulator 驗證 / 正式環境初次 seed 用）。寫入內容與排程相同。
 * 僅寫公開的 `exchange_rates`（資料源 Yahoo、idempotent），不碰任何使用者資料。
 */
export const seedUsdRate = onRequest({ region: REGION }, async (_req, res) => {
  try {
    const r = await fetchAndStoreUsdRate();
    res.json({ ok: true, ...r });
  } catch (e) {
    logger.error('seedUsdRate failed', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});
