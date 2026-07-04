import { describe, expect, it } from '@jest/globals';
import {
  buildAnalysisInput,
  type AnalysisQuoteInput,
  type AnalysisSymbolMeta,
} from './analysisInput.js';
import type { Position } from '../portfolio/deriveHoldings.js';
import type { Market } from '../enums/markets.js';

const NOW = 1_750_000_000_000;
const FRESH = NOW - 60_000; // 1 分鐘前（15min TTL 內）
const STALE = NOW - 60 * 60_000; // 1 小時前（過期）

function pos(overrides: Partial<Position> & Pick<Position, 'market' | 'symbol'>): Position {
  return {
    currency: overrides.market === 'US' ? 'USD' : 'TWD',
    quantity: '10.0000000000',
    totalCost: '1000.0000000000',
    averageCost: '100.0000000000',
    txCount: 1,
    realizedPnl: '0.0000000000',
    ...overrides,
  };
}

const positions: Position[] = [
  pos({ market: 'TW', symbol: '2330' }),
  pos({ market: 'US', symbol: 'QQQ', quantity: '2.0000000000', totalCost: '800.0000000000' }),
];

const quotes: Record<string, AnalysisQuoteInput> = {
  TW_2330: { price: '150.0000000000', fetchedAtMs: FRESH },
  US_QQQ: { price: '500.0000000000', fetchedAtMs: FRESH },
};

const metas: Record<string, AnalysisSymbolMeta> = {
  TW_2330: { name: '台積電', assetType: 'STOCK' },
  US_QQQ: { name: 'Invesco QQQ', assetType: 'ETF' },
};

const keyOf = (market: Market, symbol: string) => `${market}_${symbol}`;
const resolveQuote = (market: Market, symbol: string) => quotes[keyOf(market, symbol)];
const resolveMeta = (market: Market, symbol: string) => metas[keyOf(market, symbol)];

describe('buildAnalysisInput', () => {
  it('映射市值 = price × quantity、cost = totalCost（原幣別 10 位小數 string）', () => {
    const input = buildAnalysisInput(positions, resolveQuote, resolveMeta, NOW);
    expect(input.rawHoldings).toHaveLength(2);

    const tsmc = input.rawHoldings.find((h) => h.symbol === '2330')!;
    expect(tsmc.value).toBe('1500.0000000000'); // 150 × 10
    expect(tsmc.cost).toBe('1000.0000000000');
    expect(tsmc.currency).toBe('TWD');
    expect(tsmc.name).toBe('台積電');
    expect(tsmc.assetType).toBe('STOCK');

    const qqq = input.rawHoldings.find((h) => h.symbol === 'QQQ')!;
    expect(qqq.value).toBe('1000.0000000000'); // 500 × 2
    expect(qqq.cost).toBe('800.0000000000');
    expect(qqq.currency).toBe('USD');
    expect(qqq.assetType).toBe('ETF');
  });

  it('全數新鮮：includedCount = 全部、pendingCount = 0、anyStale = false', () => {
    const input = buildAnalysisInput(positions, resolveQuote, resolveMeta, NOW);
    expect(input.includedCount).toBe(2);
    expect(input.pendingCount).toBe(0);
    expect(input.anyStale).toBe(false);
  });

  it('缺報價的持倉排除於聚合並計入 pendingCount（不以假值充數）', () => {
    const resolver = (market: Market, symbol: string) =>
      symbol === 'QQQ' ? undefined : quotes[keyOf(market, symbol)];
    const input = buildAnalysisInput(positions, resolver, resolveMeta, NOW);
    expect(input.rawHoldings).toHaveLength(1);
    expect(input.rawHoldings[0]!.symbol).toBe('2330');
    expect(input.includedCount).toBe(1);
    expect(input.pendingCount).toBe(1);
    expect(input.anyStale).toBe(false);
  });

  it('過期報價仍納入市值（最後已知值），但 anyStale = true', () => {
    const resolver = (market: Market, symbol: string) => {
      const q = quotes[keyOf(market, symbol)];
      if (!q) return undefined;
      return symbol === 'QQQ' ? { ...q, fetchedAtMs: STALE } : q;
    };
    const input = buildAnalysisInput(positions, resolver, resolveMeta, NOW);
    expect(input.rawHoldings).toHaveLength(2);
    expect(input.includedCount).toBe(2);
    expect(input.pendingCount).toBe(0);
    expect(input.anyStale).toBe(true);
  });

  it('未來時戳（clock skew）視同過期：仍納入但 anyStale = true', () => {
    const resolver = (market: Market, symbol: string) => {
      const q = quotes[keyOf(market, symbol)];
      return q ? { ...q, fetchedAtMs: NOW + 60_000 } : undefined;
    };
    const input = buildAnalysisInput(positions, resolver, resolveMeta, NOW);
    expect(input.includedCount).toBe(2);
    expect(input.anyStale).toBe(true);
  });

  it('metadata 缺值 fallback：name = raw symbol、assetType = STOCK（歸入個股）', () => {
    const input = buildAnalysisInput(positions, resolveQuote, () => undefined, NOW);
    const qqq = input.rawHoldings.find((h) => h.symbol === 'QQQ')!;
    expect(qqq.name).toBe('QQQ');
    expect(qqq.assetType).toBe('STOCK');
  });

  it('metadata 局部缺值：只補缺的欄位', () => {
    const resolver = (market: Market, symbol: string) =>
      symbol === 'QQQ' ? { assetType: 'ETF' as const } : metas[keyOf(market, symbol)];
    const input = buildAnalysisInput(positions, resolveQuote, resolver, NOW);
    const qqq = input.rawHoldings.find((h) => h.symbol === 'QQQ')!;
    expect(qqq.name).toBe('QQQ'); // name 缺 → raw symbol
    expect(qqq.assetType).toBe('ETF');
  });

  it('空 positions → 空結果', () => {
    const input = buildAnalysisInput([], resolveQuote, resolveMeta, NOW);
    expect(input.rawHoldings).toHaveLength(0);
    expect(input.includedCount).toBe(0);
    expect(input.pendingCount).toBe(0);
    expect(input.anyStale).toBe(false);
  });

  it('輸出可直接餵 aggregateHoldings（契約對齊 AnalysisRawHolding）', () => {
    const input = buildAnalysisInput(positions, resolveQuote, resolveMeta, NOW);
    for (const h of input.rawHoldings) {
      expect(typeof h.symbol).toBe('string');
      expect(typeof h.name).toBe('string');
      expect(typeof h.cost).toBe('string');
      expect(typeof h.value).toBe('string');
    }
  });
});
