import { buildPortfolioSeries } from './buildPortfolioSeries.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };

/** 產生 fromYear 起每個平日的 YYYY-MM-DD（近似交易日軸）。 */
function weekdays(fromYear: number, toYear: number): string[] {
  const dates: string[] = [];
  for (let t = Date.UTC(fromYear, 0, 1); t <= Date.UTC(toYear, 11, 31); t += 86_400_000) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

describe('buildPortfolioSeries 效能 sanity（design.md Risks：client 重建計算量上界）', () => {
  it('25 年日線 × 10 symbols × 100 筆交易在 10 秒內完成', () => {
    const axis = weekdays(2000, 2025); // ~6,780 個平日
    const symbols = Array.from({ length: 10 }, (_, i) => `SYM${i}`);

    const closesBySymbol: Record<string, Record<string, string>> = {};
    for (const s of symbols) {
      const closes: Record<string, string> = {};
      for (let i = 0; i < axis.length; i += 1) {
        const date = axis[i];
        if (date !== undefined) closes[date] = `${100 + (i % 50)}.0000000000`;
      }
      closesBySymbol[`US_${s}`] = closes;
    }
    const fx: Record<string, string> = {};
    for (const date of axis) fx[date] = '32.0000000000';

    const transactions: TransactionDocument[] = [];
    for (let i = 0; i < 100; i += 1) {
      const date = axis[(i * 61) % axis.length];
      const symbol = symbols[i % symbols.length];
      if (date === undefined || symbol === undefined) continue;
      const doc = buildTransactionDoc(
        {
          account_id: 'acc_1',
          symbol,
          market: 'US',
          asset_type: 'STOCK',
          transaction_type: 'BUY',
          transaction_date: date,
          currency: 'USD',
          quantity: '10',
          price: '100',
          fee: '0',
          tax: '0',
          notes: '',
        },
        { transactionId: `txn_${i}` },
      );
      transactions.push({ ...doc, created_at: ts, updated_at: ts });
    }

    const started = Date.now();
    const series = buildPortfolioSeries({
      transactions,
      closesBySymbol,
      fxUsdTwdCloses: fx,
      displayCurrency: 'TWD',
    });
    const elapsedMs = Date.now() - started;

    expect(series.length).toBe(axis.length);
    expect(elapsedMs).toBeLessThan(10_000);
  });
});
