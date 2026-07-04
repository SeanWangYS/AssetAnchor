import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import {
  CURRENCIES,
  HISTORY_MARKETS,
  Money,
  type Currency,
  type HistoryMarket,
} from '@assetanchor/shared';
import { INTRADAY_PARAMS, yahooHistoryProvider, type IntradayTf } from './yahooHistoryProvider';

const REGION = 'asia-east1';

type ParseResult =
  | { ok: true; market: HistoryMarket; symbol: string; currency: Currency; tf: IntradayTf }
  | { ok: false; msg: string };

function parseInput(q: Record<string, unknown>): ParseResult {
  const market = String(q.market ?? '');
  const symbol = String(q.symbol ?? '')
    .trim()
    .toUpperCase();
  const currency = String(q.currency ?? '');
  const tf = String(q.tf ?? '');
  if (!(HISTORY_MARKETS as readonly string[]).includes(market) || !symbol) {
    return { ok: false, msg: 'market/symbol 必填且需合法' };
  }
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, msg: 'currency 需合法' };
  }
  if (!(tf in INTRADAY_PARAMS)) return { ok: false, msg: 'tf 需為 1D|1W' };
  return {
    ok: true,
    market: market as HistoryMarket,
    symbol,
    currency: currency as Currency,
    tf: tf as IntradayTf,
  };
}

/**
 * HTTP `fetchIntraday`（GET ?market=&symbol=&currency=&tf=1D|1W）：盤中粒度即抓即回、
 * **不落地**（ADR-0010 D5——盤中資料時效短）。點列 close 以 Money 10 位小數 string 回傳，
 * 無效 bar（null / ≤0）剔除；mobile 端記憶體 cache。
 */
export const fetchIntraday = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const parsed = parseInput(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.msg });
    return;
  }
  try {
    const bars = await yahooHistoryProvider.fetchIntraday(parsed.market, parsed.symbol, parsed.tf);
    const points = bars
      .filter((b) => b.close !== null && Number.isFinite(b.close) && b.close > 0)
      .map((b) => ({
        ts: b.ts,
        close: new Money(b.close as number, parsed.currency).toDecimalString(),
      }));
    res.json({ ok: true, points });
  } catch (e) {
    logger.error('fetchIntraday failed', { query: req.query, error: String(e) });
    res.status(502).json({ ok: false, error: '盤中資料暫時無法取得' });
  }
});
