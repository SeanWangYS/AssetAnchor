import { buildPortfolioSeries } from './buildPortfolioSeries.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import type { Market } from '../enums/index.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };

let seq = 0;

function tx(
  type: 'BUY' | 'SELL',
  opts: {
    symbol: string;
    market: Market;
    currency: 'USD' | 'TWD';
    quantity: string;
    price: string;
    date: string;
  },
): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: 'acc_1',
      symbol: opts.symbol,
      market: opts.market,
      asset_type: 'STOCK',
      transaction_type: type,
      transaction_date: opts.date,
      currency: opts.currency,
      quantity: opts.quantity,
      price: opts.price,
      fee: '0',
      tax: '0',
      notes: '',
    },
    { transactionId: `txn_${seq}` },
  );
  return { ...doc, created_at: ts, updated_at: ts };
}

const D = (n: string) => `${n}.0000000000`;

describe('buildPortfolioSeries', () => {
  it('單一 TWD 標的：市值＝持股 × 當日收盤', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '10',
          price: '900',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        TW_2330: { '2025-01-02': D('900'), '2025-01-03': D('910') },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
    });
    expect(series.map((p) => p.date)).toEqual(['2025-01-02', '2025-01-03']);
    expect(series[0]?.value.toDecimalString()).toBe(D('9000'));
    expect(series[1]?.value.toDecimalString()).toBe(D('9100'));
  });

  it('買入日之前該標的不計入（值為 0）', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '10',
          price: '900',
          date: '2025-01-03',
        }),
      ],
      closesBySymbol: {
        TW_2330: { '2025-01-02': D('890'), '2025-01-03': D('900') },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
    });
    expect(series[0]).toEqual(expect.objectContaining({ date: '2025-01-02' }));
    expect(series[0]?.value.isZero()).toBe(true);
    expect(series[1]?.value.toDecimalString()).toBe(D('9000'));
  });

  it('SELL 之後持股量遞減', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '10',
          price: '900',
          date: '2025-01-02',
        }),
        tx('SELL', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '4',
          price: '905',
          date: '2025-01-03',
        }),
      ],
      closesBySymbol: {
        TW_2330: { '2025-01-02': D('900'), '2025-01-03': D('910') },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
    });
    expect(series[1]?.value.toDecimalString()).toBe(D('5460')); // 6 × 910
  });

  it('USD 部位以當日 FX 換算成 TWD；FX 缺日 forward-fill', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: 'AAPL',
          market: 'US',
          currency: 'USD',
          quantity: '2',
          price: '200',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        US_AAPL: { '2025-01-02': D('200'), '2025-01-03': D('210') },
      },
      // 只有 01-02 有匯率 → 01-03 forward-fill 用 32
      fxUsdTwdCloses: { '2025-01-02': D('32') },
      displayCurrency: 'TWD',
    });
    expect(series[0]?.value.toDecimalString()).toBe(D('12800')); // 400 × 32
    expect(series[1]?.value.toDecimalString()).toBe(D('13440')); // 420 × 32
  });

  it('顯示幣別 USD 時 TWD 部位以 FX 反向換算', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '10',
          price: '320',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        TW_2330: { '2025-01-02': D('320') },
      },
      fxUsdTwdCloses: { '2025-01-02': D('32') },
      displayCurrency: 'USD',
    });
    expect(series[0]?.value.toDecimalString()).toBe(D('100')); // 3200 / 32
  });

  it('持有標的當日缺收盤（forward-fill 後仍無值）→ 該日期剔除', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '10',
          price: '900',
          date: '2025-01-02',
        }),
        tx('BUY', {
          symbol: '0050',
          market: 'TW',
          currency: 'TWD',
          quantity: '5',
          price: '150',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        TW_2330: { '2025-01-02': D('900') },
        // 0050 序列從 01-03 才開始 → 01-02 無值可填 → 該日剔除
        TW_0050: { '2025-01-03': D('150') },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
    });
    expect(series.map((p) => p.date)).toEqual(['2025-01-03']);
  });

  it('USD 部位需要 FX 但整段缺 FX → 該日期剔除', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: 'AAPL',
          market: 'US',
          currency: 'USD',
          quantity: '2',
          price: '200',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        US_AAPL: { '2025-01-02': D('200') },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
    });
    expect(series).toEqual([]);
  });

  it('from/to 切片（含端點）', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('BUY', {
          symbol: '2330',
          market: 'TW',
          currency: 'TWD',
          quantity: '1',
          price: '900',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        TW_2330: {
          '2025-01-02': D('900'),
          '2025-01-03': D('910'),
          '2025-01-06': D('920'),
        },
      },
      fxUsdTwdCloses: {},
      displayCurrency: 'TWD',
      from: '2025-01-03',
      to: '2025-01-03',
    });
    expect(series.map((p) => p.date)).toEqual(['2025-01-03']);
  });

  it('孤兒 SELL（超賣）不 throw，該標的貢獻略過', () => {
    const series = buildPortfolioSeries({
      transactions: [
        tx('SELL', {
          symbol: 'QQQ',
          market: 'US',
          currency: 'USD',
          quantity: '5',
          price: '500',
          date: '2025-01-02',
        }),
      ],
      closesBySymbol: {
        US_QQQ: { '2025-01-02': D('500') },
      },
      fxUsdTwdCloses: { '2025-01-02': D('32') },
      displayCurrency: 'TWD',
    });
    expect(series[0]?.value.isZero()).toBe(true);
  });

  it('無任何價格資料回空陣列', () => {
    expect(
      buildPortfolioSeries({
        transactions: [],
        closesBySymbol: {},
        fxUsdTwdCloses: {},
        displayCurrency: 'TWD',
      }),
    ).toEqual([]);
  });
});
