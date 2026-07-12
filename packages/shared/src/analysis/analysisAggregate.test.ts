import { describe, expect, it } from '@jest/globals';
import { aggregateHoldings, returnPercent, type AnalysisRawHolding } from './analysisAggregate.js';
import { ASSET_TYPES } from '../enums/asset-types.js';
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

  it('逐持倉換算成基準幣別（USD×30），保留 assetType', () => {
    const tsmc = agg.holdings.find((h) => h.symbol === '2330')!;
    const qqq = agg.holdings.find((h) => h.symbol === 'QQQ')!;
    expect(tsmc.value.toNumber()).toBe(1200);
    expect(tsmc.pnl.toNumber()).toBe(200);
    expect(tsmc.returnPct).toBe(20);
    expect(tsmc.assetType).toBe('STOCK');
    expect(qqq.value.toNumber()).toBe(3000); // 100 USD × 30
    expect(qqq.cost.toNumber()).toBe(3000);
    expect(qqq.returnPct).toBe(0);
    expect(qqq.assetType).toBe('ETF');
  });

  it('totals 跨幣別合計', () => {
    expect(agg.totals.value.toNumber()).toBe(4200); // 1200 + 3000
    expect(agg.totals.cost.toNumber()).toBe(4000); // 1000 + 3000
    expect(agg.totals.pnl.toNumber()).toBe(200);
    expect(agg.totals.returnPct).toBe(5); // 200/4000
  });

  it('byAssetType 佔比（幣別無關，基準市值）', () => {
    const stock = agg.byAssetType.find((c) => c.assetType === 'STOCK')!;
    const etf = agg.byAssetType.find((c) => c.assetType === 'ETF')!;
    expect(stock.count).toBe(1);
    expect(stock.value.toNumber()).toBe(1200);
    expect(stock.sharePct).toBeCloseTo(28.5714, 3); // 1200/4200
    expect(etf.value.toNumber()).toBe(3000);
    expect(etf.sharePct).toBeCloseTo(71.4285, 3); // 3000/4200
  });

  it('byAssetType 為 enum 驅動：涵蓋每個 ASSET_TYPES（未持有者 count 0）', () => {
    // 保證「新增 asset_type enum 值 → 圓餅圖自動多一 rollup」的契約。
    expect(agg.byAssetType.map((c) => c.assetType)).toEqual([...ASSET_TYPES]);
    const bond = agg.byAssetType.find((c) => c.assetType === 'BOND')!;
    expect(bond.count).toBe(0);
    expect(bond.value.toNumber()).toBe(0);
    expect(bond.sharePct).toBe(0);
  });

  it('空輸入 → 全 0、不丟', () => {
    const empty = aggregateHoldings([], rates, 'TWD');
    expect(empty.totals.value.toNumber()).toBe(0);
    expect(empty.totals.returnPct).toBe(0);
    expect(empty.byAssetType.every((c) => c.count === 0 && c.sharePct === 0)).toBe(true);
  });
});

describe('aggregateHoldings — 加密貨幣自成一類（不併入個股）', () => {
  const withCrypto: AnalysisRawHolding[] = [
    {
      symbol: '2330',
      name: '台積電',
      assetType: 'STOCK',
      currency: 'TWD',
      cost: '800',
      value: '1000',
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ',
      assetType: 'ETF',
      currency: 'USD',
      cost: '100',
      value: '100',
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      assetType: 'CRYPTO',
      currency: 'USD',
      cost: '20',
      value: '40',
    },
  ];
  const agg = aggregateHoldings(withCrypto, rates, 'TWD');

  it('crypto 持倉 assetType = CRYPTO', () => {
    const btc = agg.holdings.find((h) => h.symbol === 'BTC')!;
    expect(btc.assetType).toBe('CRYPTO');
    expect(btc.value.toNumber()).toBe(1200); // 40 USD × 30
  });

  it('byAssetType 出現獨立 CRYPTO rollup，且 STOCK 不含 crypto 市值', () => {
    // totalValue = 1000(股) + 3000(ETF) + 1200(crypto) = 5200
    const stock = agg.byAssetType.find((c) => c.assetType === 'STOCK')!;
    const crypto = agg.byAssetType.find((c) => c.assetType === 'CRYPTO')!;
    expect(crypto.count).toBe(1);
    expect(crypto.value.toNumber()).toBe(1200);
    expect(crypto.sharePct).toBeCloseTo(23.0769, 3); // 1200/5200
    // 回歸守門：STOCK rollup 僅含台積電 1000，未被 crypto 汙染
    expect(stock.count).toBe(1);
    expect(stock.value.toNumber()).toBe(1000);
  });
});
