import type { HistoryItem } from './parseHistoryInput';

export type EnsureResult =
  | { symbolId: string; lastDate: string | null; cached: boolean }
  | { symbolId: string; error: string; deferred?: true };

/** Item-level error text; the client only checks for its presence. */
const ITEM_ERROR = '歷史資料暫時無法取得';

export interface EnsureBatchDeps {
  ensureOne: (item: HistoryItem) => Promise<EnsureResult>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** Stop starting new items once this much time has elapsed since the batch began. */
  budgetMs: number;
  /** Minimum gap before an item that follows a real Yahoo request. */
  throttleMs: number;
  onError?: (item: HistoryItem, error: unknown) => void;
}

/**
 * Runs an ensureHistory batch sequentially with per-item error isolation, Yahoo
 * throttling and a time budget. Once the budget is spent, remaining items are returned
 * as deferred errors without touching Yahoo, so the request finishes well inside the
 * function timeout instead of being killed mid-batch (which would lose every result).
 * The client keeps its old data for deferred items and retries on its next pass.
 */
export async function runEnsureBatch(
  items: readonly HistoryItem[],
  deps: EnsureBatchDeps,
): Promise<EnsureResult[]> {
  const startedMs = deps.now();
  const results: EnsureResult[] = [];
  let didFetch = false;
  for (const item of items) {
    const symbolId = `${item.market}_${item.symbol}`;
    if (deps.now() - startedMs >= deps.budgetMs) {
      results.push({ symbolId, error: ITEM_ERROR, deferred: true });
      continue;
    }
    if (didFetch) await deps.sleep(deps.throttleMs);
    try {
      const r = await deps.ensureOne(item);
      didFetch = !('cached' in r) || !r.cached;
      results.push(r);
    } catch (e) {
      deps.onError?.(item, e);
      didFetch = true; // a failed item still hit Yahoo; keep throttling
      results.push({ symbolId, error: ITEM_ERROR });
    }
  }
  return results;
}
