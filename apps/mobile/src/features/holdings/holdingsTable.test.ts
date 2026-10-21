import { Money, type Position, type PerformanceSummary } from '@assetanchor/shared';
import type { QuoteEntry } from '../../services/quotes';
import {
  buildHoldingRow,
  buildTableSections,
  nextSort,
  sortRows,
  type RowContext,
} from './holdingsTable';

const NOW = 1_800_000_000_000;
const FRESH = NOW - 60_000;
const STALE = NOW - 3 * 60 * 60_000;
const RATES = { USD_TWD: '32.5950000000', TWD_USD: '0.0306795521' };

function pos(p: Partial<Position> & Pick<Position, 'symbol'>): Position {
  return {
    market: 'TW',
    currency: 'TWD',
    quantity: '1000',
    totalCost: '100000.0000000000',
    averageCost: '100.0000000000',
    txCount: 1,
    realizedPnl: '0.0000000000',
    ...p,
  };
}

function quote(
  price: string,
  prevClose: string | null,
  fetchedAtMs: number,
  currency: 'TWD' | 'USD' = 'TWD',
): QuoteEntry {
  return { price, prevClose, currency, fetchedAtMs };
}

function ctx(quotes: Record<string, QuoteEntry>, over: Partial<RowContext> = {}): RowContext {
  return {
    getQuote: (m, s) => quotes[`${m}_${s}`],
    errorOf: () => undefined,
    rates: RATES,
    displayCurrency: 'TWD',
    nowMs: NOW,
    totalValue: new Money('1000000', 'TWD'),
    performanceOf: () => null,
    ...over,
  };
}

const aapl = pos({
  symbol: 'AAPL',
  market: 'US',
  currency: 'USD',
  quantity: '40',
  totalCost: '7688.0000000000',
  averageCost: '192.2000000000',
});

describe('buildHoldingRow', () => {
  it('shows every amount in the display currency', () => {
    const row = buildHoldingRow(aapl, ctx({ US_AAPL: quote('340.37', '342.94', FRESH, 'USD') }));
    expect(row.status).toBe('ok');
    expect(row.cells.price.text).toBe('11,094.36');
    expect(row.cells.avg.text).toBe('6,264.76');
    expect(row.cells.mv.text).toBe('443,774');
    expect(row.cells.cost.text).toBe('250,590');
    expect(row.marketValue?.currency).toBe('TWD');
  });

  it('computes return% in the native currency (no FX effect)', () => {
    const row = buildHoldingRow(aapl, ctx({ US_AAPL: quote('340.37', '342.94', FRESH, 'USD') }));
    expect(row.cells.ret.text).toBe('+77.09%');
    expect(row.cells.ret.tone).toBe('up');
    expect(row.sortValues.ret).toBeCloseTo(77.0916, 3);
  });

  it('signs unrealized P&L and colors it', () => {
    const loss = pos({
      symbol: '0050',
      totalCost: '453644.0000000000',
      averageCost: '151.2146666667',
      quantity: '3000',
    });
    const row = buildHoldingRow(loss, ctx({ TW_0050: quote('107.25', '108.15', FRESH) }));
    expect(row.cells.unreal.text).toBe('−131,894');
    expect(row.cells.unreal.tone).toBe('down');
  });

  it('shows today% only for a fresh quote with a previous close', () => {
    const fresh = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', '100', FRESH) }),
    );
    expect(fresh.cells.today.text).toBe('+10.00%');
    const stale = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', '100', STALE) }),
    );
    expect(stale.cells.today.text).toBe('—');
    expect(stale.sortValues.today).toBeNull();
    const noPrev = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', null, FRESH) }),
    );
    expect(noPrev.cells.today.text).toBe('—');
  });

  it('uses the whole portfolio as the weight denominator', () => {
    const row = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('250', '250', FRESH) }),
    );
    expect(row.cells.weight.text).toBe('25.0%');
  });

  it('marks cumulative returns with an asterisk', () => {
    const perf: PerformanceSummary = {
      kind: 'cumulative',
      rate: '0.1234000000',
      averageYearsInvested: '0.5',
    };
    const row = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', '100', FRESH) }, { performanceOf: () => perf }),
    );
    expect(row.cells.xirr.text).toBe('+12.34%');
    expect(row.xirrCumulative).toBe(true);
    const none = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', '100', FRESH) }),
    );
    expect(none.cells.xirr.text).toBe('—');
  });

  it('degrades rows without a quote but keeps quote-free columns', () => {
    const pending = buildHoldingRow(pos({ symbol: '2330' }), ctx({}));
    expect(pending.status).toBe('pending');
    expect(pending.cells.mv.text).toBe('更新中…');
    expect(pending.cells.qty.text).toBe('1,000');
    expect(pending.cells.cost.text).toBe('100,000');
    expect(pending.cells.ret.text).toBe('');
    expect(pending.marketValue).toBeNull();
    const notFound = buildHoldingRow(
      pos({ symbol: 'ZZZ' }),
      ctx({}, { errorOf: () => 'symbol_not_found' }),
    );
    expect(notFound.status).toBe('not_found');
    expect(notFound.cells.mv.text).toBe('查無代號');
  });

  it('treats a missing conversion rate as updating but still shows shares', () => {
    const usdt = pos({ symbol: 'BTC', market: 'CRYPTO', currency: 'USDT', quantity: '0.5' });
    const row = buildHoldingRow(
      usdt,
      ctx({ CRYPTO_BTC: quote('60000', '59000', FRESH, 'USD') }, { rates: null }),
    );
    expect(row.status).toBe('pending');
    expect(row.cells.qty.text).toBe('0.5');
    expect(row.cells.avg.text).toBe('—');
    expect(row.cells.cost.text).toBe('—');
  });

  it('shows a dash for return% when the average cost is zero', () => {
    const free = pos({ symbol: '2330', totalCost: '0.0000000000', averageCost: '0.0000000000' });
    const row = buildHoldingRow(free, ctx({ TW_2330: quote('110', '100', FRESH) }));
    expect(row.cells.ret.text).toBe('—');
    expect(row.sortValues.ret).toBeNull();
  });

  it('shows a dash for weight without a portfolio total', () => {
    const row = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('110', '100', FRESH) }, { totalValue: null }),
    );
    expect(row.cells.weight.text).toBe('—');
  });

  it('shows a flat, unsigned zero for break-even rows', () => {
    const row = buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx({ TW_2330: quote('100', '100', FRESH) }),
    );
    expect(row.cells.unreal.text).toBe('0');
    expect(row.cells.unreal.tone).toBe('flat');
    expect(row.cells.ret.tone).toBe('flat');
  });

  it('passes the account scope to the performance callback', () => {
    const seen: (readonly string[] | undefined)[] = [];
    buildHoldingRow(
      pos({ symbol: '2330' }),
      ctx(
        { TW_2330: quote('110', '100', FRESH) },
        {
          performanceOf: (_p, ids) => {
            seen.push(ids);
            return null;
          },
        },
      ),
      { accountIds: ['acc_A'] },
    );
    expect(seen).toEqual([['acc_A']]);
  });
});

describe('buildTableSections', () => {
  const quotes = {
    TW_2330: quote('2405', '2420', FRESH),
    TW_0050: quote('107.25', '108.15', FRESH),
    US_AAPL: quote('340.37', '342.94', FRESH, 'USD'),
  };
  const p2330 = pos({ symbol: '2330', quantity: '2000' });
  const p0050 = pos({ symbol: '0050', quantity: '3000' });

  it('has a single untitled section for the holdings mode', () => {
    const s = buildTableSections({
      mode: '持股',
      positions: [p2330, aapl],
      accountGroups: [],
      orphanAccountIds: [],
      ctx: ctx(quotes),
    });
    expect(s).toHaveLength(1);
    expect(s[0]!.label).toBeNull();
    expect(s[0]!.rows.map((r) => r.symbol)).toEqual(['2330', 'AAPL']);
  });

  it('groups by market with display-currency subtotals, largest first', () => {
    const s = buildTableSections({
      mode: '類別',
      positions: [aapl, p0050, p2330],
      accountGroups: [],
      orphanAccountIds: [],
      ctx: ctx(quotes),
    });
    expect(s.map((x) => x.label)).toEqual(['台股', '美股']);
    expect(s[0]!.subtotalText).toBe('5,131,750');
    expect(s[0]!.count).toBe(2);
  });

  it('groups by real accounts, keeps unassigned last and scopes rows to the account', () => {
    const s = buildTableSections({
      mode: '帳戶',
      positions: [],
      accountGroups: [
        { accountId: '', accountName: '未分類', positions: [p2330], skipped: [] },
        {
          accountId: 'acc_small',
          accountName: '富邦證券',
          positions: [p0050],
          skipped: [{ market: 'TW', symbol: 'BAD' }],
        },
        { accountId: 'acc_big', accountName: '群益證券', positions: [p2330, p0050], skipped: [] },
      ],
      orphanAccountIds: ['acc_gone'],
      ctx: ctx(quotes),
    });
    expect(s.map((x) => x.label)).toEqual(['群益證券', '富邦證券', '未分類']);
    expect(s[1]!.skippedCount).toBe(1);
    expect(s[0]!.rows[0]!.accountIds).toEqual(['acc_big']);
    expect(s[2]!.rows[0]!.accountIds).toEqual(['acc_gone']);
    expect(s[0]!.rows[0]!.key).not.toBe(s[2]!.rows[0]!.key);
  });

  it('leaves rows without quotes out of subtotals', () => {
    const s = buildTableSections({
      mode: '類別',
      positions: [p2330, pos({ symbol: '9999' })],
      accountGroups: [],
      orphanAccountIds: [],
      ctx: ctx(quotes),
    });
    expect(s[0]!.subtotalText).toBe('4,810,000');
  });
});

describe('sortRows / nextSort', () => {
  const c = ctx({
    TW_A: quote('120', '100', FRESH),
    TW_B: quote('300', '300', STALE),
    TW_C: quote('90', '100', FRESH),
  });
  const rows = [
    buildHoldingRow(pos({ symbol: 'B' }), c),
    buildHoldingRow(pos({ symbol: 'C' }), c),
    buildHoldingRow(pos({ symbol: 'A' }), c),
    buildHoldingRow(pos({ symbol: 'D' }), c), // no quote
  ];
  const order = (sorted: typeof rows) => sorted.map((r) => r.symbol);

  it('sorts by a numeric column in both directions with missing values last', () => {
    expect(order(sortRows(rows, { key: 'mv', dir: 'desc' }))).toEqual(['B', 'A', 'C', 'D']);
    expect(order(sortRows(rows, { key: 'mv', dir: 'asc' }))).toEqual(['C', 'A', 'B', 'D']);
    expect(order(sortRows(rows, { key: 'today', dir: 'desc' }))).toEqual(['A', 'C', 'B', 'D']);
  });

  it('sorts by symbol and breaks ties by symbol', () => {
    expect(order(sortRows(rows, { key: 'symbol', dir: 'asc' }))).toEqual(['A', 'B', 'C', 'D']);
    expect(order(sortRows(rows, { key: 'symbol', dir: 'desc' }))).toEqual(['D', 'C', 'B', 'A']);
    expect(order(sortRows(rows, { key: 'qty', dir: 'desc' }))).toEqual(['A', 'B', 'C', 'D']);
  });

  it('does not mutate the input', () => {
    const before = order(rows);
    sortRows(rows, { key: 'mv', dir: 'asc' });
    expect(order(rows)).toEqual(before);
  });

  it('starts new columns descending (symbol ascending) and flips on repeat', () => {
    expect(nextSort({ key: 'mv', dir: 'desc' }, 'ret')).toEqual({ key: 'ret', dir: 'desc' });
    expect(nextSort({ key: 'mv', dir: 'desc' }, 'symbol')).toEqual({ key: 'symbol', dir: 'asc' });
    expect(nextSort({ key: 'ret', dir: 'desc' }, 'ret')).toEqual({ key: 'ret', dir: 'asc' });
    expect(nextSort({ key: 'ret', dir: 'asc' }, 'ret')).toEqual({ key: 'ret', dir: 'desc' });
  });
});
