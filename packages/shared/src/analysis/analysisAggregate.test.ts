import { describe, expect, it } from '@jest/globals';
import {
  aggregateHoldings,
  classOf,
  returnPercent,
  type AnalysisRawHolding,
} from './analysisAggregate.js';
import { Money } from '../money/index.js';
import type { RateMap } from '../types/exchange-rate.js';

const rates: RateMap = { USD_TWD: '30', TWD_USD: (1 / 30).toString() };

const fixture: AnalysisRawHolding[] = [
  {
    symbol: '2330',
    name: '台積電',
    assetType: 'STOCK',
    currency: 'TWD',
    cost: '1000',
    value: '1200',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ',
    assetType: 'ETF',
    currency: 'USD',
    cost: '100',
    value: '100',
  },
];

describe('classOf', () => {
  it('ETF → ETF，其餘 → 個股', () => {
    expect(classOf('ETF')).toBe('ETF');
    expect(classOf('STOCK')).toBe('個股');
  });
});

describe('returnPercent', () => {
  it('一般情形', () => {
    expect(returnPercent(new Money('120', 'TWD'), new Money('100', 'TWD'))).toBe(20);
  });
  it('成本為 0 防零除回 0', () => {
    expect(returnPercent(new Money('120', 'TWD'), Money.zero('TWD'))).toBe(0);
  });
});

describe('aggregateHoldings', () => {
  const agg = aggregateHoldings(fixture, rates, 'TWD');

  it('逐持倉換算成基準幣別（USD×30）', () => {
    const tsmc = agg.holdings.find((h) => h.symbol === '2330')!;
    const qqq = agg.holdings.find((h) => h.symbol === 'QQQ')!;
    expect(tsmc.value.toNumber()).toBe(1200);
    expect(tsmc.pnl.toNumber()).toBe(200);
    expect(tsmc.returnPct).toBe(20);
    expect(tsmc.cls).toBe('個股');
    expect(qqq.value.toNumber()).toBe(3000); // 100 USD × 30
    expect(qqq.cost.toNumber()).toBe(3000);
    expect(qqq.returnPct).toBe(0);
    expect(qqq.cls).toBe('ETF');
  });

  it('totals 跨幣別合計', () => {
    expect(agg.totals.value.toNumber()).toBe(4200); // 1200 + 3000
    expect(agg.totals.cost.toNumber()).toBe(4000); // 1000 + 3000
    expect(agg.totals.pnl.toNumber()).toBe(200);
    expect(agg.totals.returnPct).toBe(5); // 200/4000
  });

  it('byClass 佔比（幣別無關，基準市值）', () => {
    const stock = agg.byClass.find((c) => c.cls === '個股')!;
    const etf = agg.byClass.find((c) => c.cls === 'ETF')!;
    expect(stock.count).toBe(1);
    expect(stock.value.toNumber()).toBe(1200);
    expect(stock.sharePct).toBeCloseTo(28.5714, 3); // 1200/4200
    expect(etf.value.toNumber()).toBe(3000);
    expect(etf.sharePct).toBeCloseTo(71.4285, 3); // 3000/4200
  });

  it('空輸入 → 全 0、不丟', () => {
    const empty = aggregateHoldings([], rates, 'TWD');
    expect(empty.totals.value.toNumber()).toBe(0);
    expect(empty.totals.returnPct).toBe(0);
    expect(empty.byClass.every((c) => c.count === 0 && c.sharePct === 0)).toBe(true);
  });
});
