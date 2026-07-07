/**
 * 解析 Yahoo v8 chart 回應（TWD=X）→ `{ date, rate }`（純函式，可測；不打外網）。
 *
 * `rate` = `meta.regularMarketPrice` 的字串表示（呼叫端以 `Money(rate, 'TWD')` 收斂精度）；
 * `date` = `meta.regularMarketTime`（epoch 秒）換算 **Asia/Taipei** 日曆日（YYYY-MM-DD）——
 * 外匯資料時戳落在哪個台北日，文件就掛哪天，休市日不產生空文件（同原台銀「實際牌告日」語義）。
 * 缺欄 / 非正數 / 缺時戳一律 fail loud 擲錯，由呼叫端保證不寫半套文件。
 */

/** en-CA locale 的日期格式恰為 YYYY-MM-DD（Node 22 內建 ICU）。 */
const TAIPEI_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' });

export interface YahooFxRate {
  /** 資料日（Asia/Taipei 日曆日，YYYY-MM-DD）。 */
  date: string;
  /** 1 USD = N TWD 的來源值字串。 */
  rate: string;
}

export function parseYahooFxRate(json: unknown): YahooFxRate {
  const result = (json as { chart?: { result?: unknown[] } })?.chart?.result;
  const meta = Array.isArray(result)
    ? (result[0] as { meta?: Record<string, unknown> } | undefined)?.meta
    : undefined;
  if (!meta) throw new Error('Yahoo FX 解析失敗：回應缺 chart.result[0].meta');

  const price = meta.regularMarketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new Error('Yahoo FX 解析失敗：regularMarketPrice 缺漏或非正數');
  }
  const timeSec = meta.regularMarketTime;
  if (typeof timeSec !== 'number' || !Number.isFinite(timeSec)) {
    throw new Error('Yahoo FX 解析失敗：regularMarketTime 缺漏');
  }

  return { date: TAIPEI_DATE.format(new Date(timeSec * 1000)), rate: String(price) };
}
