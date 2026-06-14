import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Money } from '@assetanchor/shared';
import { parseBotUsdCsv } from './parseBotCsv';

const BOT_USD_L6M_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/L6M/USD';
const REGION = 'asia-east1';

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

/**
 * 抓台銀 USD L6M CSV → 解析即期賣出 → 以 Admin SDK upsert `exchange_rates/{牌告日}`。
 *
 * 回傳寫入的牌告日。idempotent（同牌告日覆寫同一文件）。抓取/解析失敗一律 fail loud，
 * 不寫半套文件（ADR-0005 / design D4、D7）。匯率以 `Money` 序列化成 10 位小數 string。
 */
export async function fetchAndStoreUsdRate(): Promise<{ date: string }> {
  ensureApp();

  const res = await fetch(BOT_USD_L6M_URL);
  if (!res.ok) {
    throw new Error(`BOT fetch 失敗：HTTP ${res.status}`);
  }
  const csv = await res.text();
  const { boardDate, spotSell } = parseBotUsdCsv(csv);

  // 1 USD = N TWD（spot_sell）；反向 TWD_USD 預存（互為倒數）。皆 10 位小數 string。
  const usdTwd = new Money(spotSell, 'TWD').toDecimalString();
  const twdUsd = new Money('1', 'TWD').divide(spotSell).toDecimalString();

  await getFirestore()
    .collection('exchange_rates')
    .doc(boardDate)
    .set({
      date: boardDate,
      source: 'BOT',
      rate_type: 'spot_sell',
      rates: { USD_TWD: usdTwd, TWD_USD: twdUsd },
      fetched_at: FieldValue.serverTimestamp(),
      is_estimated: false,
    });

  return { date: boardDate };
}

/** 每日排程（Asia/Taipei 16:30，牌告固定後）抓取並寫入最新匯率。 */
export const scheduledUsdRate = onSchedule(
  { schedule: '30 16 * * *', timeZone: 'Asia/Taipei', region: REGION },
  async () => {
    const r = await fetchAndStoreUsdRate();
    logger.info('exchange rate stored', r);
  },
);

/**
 * 手動觸發端點（emulator 驗證 / 正式環境初次 seed 用）。寫入內容與排程相同。
 * 僅寫公開的 `exchange_rates`（資料源台銀、idempotent），不碰任何使用者資料。
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
