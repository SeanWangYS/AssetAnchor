import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getOrFetchQuote } from './fetchQuote';
import { parseBatchInput } from './parseBatchInput';
import { yahooProvider } from './yahooProvider';

const REGION = 'asia-east1';

/**
 * HTTP `fetchQuotes`（GET ?items=market:symbol:currency,market:symbol:currency,...）：
 * mobile 開持倉頁時以**單次呼叫**取多檔報價，取代逐檔 `fetchQuote`（N→1）。
 * 重用 `getOrFetchQuote`（server 端 15min 新鮮度 + sanitize + 寫 quotes/）；逐筆錯誤隔離
 * （單檔失敗回該筆 error，不拖垮整批）。onRequest（非 onCall，對齊 fetchQuote）、cors。
 */
export const fetchQuotes = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const parsed = parseBatchInput(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.msg });
    return;
  }
  const now = Date.now();
  const quotes = await Promise.all(
    parsed.items.map(async (item) => {
      const symbolId = `${item.market}_${item.symbol}`;
      try {
        return await getOrFetchQuote(item, yahooProvider, now);
      } catch (e) {
        logger.error('fetchQuotes item failed', { item, error: String(e) });
        return { symbolId, error: '報價暫時無法取得' };
      }
    }),
  );
  res.json({ ok: true, quotes });
});
