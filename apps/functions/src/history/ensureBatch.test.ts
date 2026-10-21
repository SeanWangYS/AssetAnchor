import { runEnsureBatch, type EnsureResult } from './ensureBatch';
import type { HistoryItem } from './parseHistoryInput';

const item = (symbol: string): HistoryItem => ({
  market: 'US',
  symbol,
  currency: 'USD',
  from: '2024-01-02',
});

/** Fake clock: sleep advances time; each ensureOne call costs `costMs[symbol]`. */
function harness(
  costMs: Record<string, number>,
  outcome: Record<string, 'cached' | 'fetched' | 'throw'>,
) {
  let t = 0;
  const sleeps: number[] = [];
  const calls: string[] = [];
  const deps = {
    now: () => t,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    ensureOne: async (it: HistoryItem): Promise<EnsureResult> => {
      calls.push(it.symbol);
      t += costMs[it.symbol] ?? 0;
      const symbolId = `${it.market}_${it.symbol}`;
      if (outcome[it.symbol] === 'throw') throw new Error('boom');
      return { symbolId, lastDate: '2026-10-20', cached: outcome[it.symbol] === 'cached' };
    },
    budgetMs: 50_000,
    throttleMs: 1_000,
  };
  return { deps, sleeps, calls };
}

describe('runEnsureBatch', () => {
  it('throttles only after an item that actually hit Yahoo', async () => {
    const h = harness({}, { A: 'cached', B: 'fetched', C: 'fetched', D: 'cached' });
    const res = await runEnsureBatch([item('A'), item('B'), item('C'), item('D')], h.deps);
    expect(res.map((r) => r.symbolId)).toEqual(['US_A', 'US_B', 'US_C', 'US_D']);
    // A cached → no wait before B; B and C fetched → wait before C and D.
    expect(h.sleeps).toEqual([1_000, 1_000]);
  });

  it('isolates a failing item and still throttles after it', async () => {
    const h = harness({}, { A: 'throw', B: 'cached' });
    const res = await runEnsureBatch([item('A'), item('B')], h.deps);
    expect(res[0]).toEqual({ symbolId: 'US_A', error: '歷史資料暫時無法取得' });
    expect(res[1]).toEqual({ symbolId: 'US_B', lastDate: '2026-10-20', cached: true });
    expect(h.sleeps).toEqual([1_000]);
  });

  it('defers remaining items once the time budget is spent, keeping finished results', async () => {
    const h = harness({ A: 30_000, B: 25_000 }, { A: 'fetched', B: 'fetched', C: 'fetched' });
    const res = await runEnsureBatch([item('A'), item('B'), item('C'), item('D')], h.deps);
    expect(h.calls).toEqual(['A', 'B']); // C and D never reach Yahoo
    expect(res).toEqual([
      { symbolId: 'US_A', lastDate: '2026-10-20', cached: false },
      { symbolId: 'US_B', lastDate: '2026-10-20', cached: false },
      { symbolId: 'US_C', error: '歷史資料暫時無法取得', deferred: true },
      { symbolId: 'US_D', error: '歷史資料暫時無法取得', deferred: true },
    ]);
  });

  it('starts an item when the budget is not yet spent, even if close to it', async () => {
    const h = harness({ A: 48_000 }, { A: 'cached', B: 'fetched' });
    const res = await runEnsureBatch([item('A'), item('B')], h.deps);
    expect(h.calls).toEqual(['A', 'B']);
    expect(res[1]).toEqual({ symbolId: 'US_B', lastDate: '2026-10-20', cached: false });
  });

  it('returns an empty list for an empty batch', async () => {
    const h = harness({}, {});
    await expect(runEnsureBatch([], h.deps)).resolves.toEqual([]);
  });
});
