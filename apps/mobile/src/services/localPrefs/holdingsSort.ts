/** Holdings table sortable columns (design spec D10). `symbol` is the frozen column. */
export const HOLDINGS_SORT_KEYS = [
  'symbol',
  'mv',
  'ret',
  'unreal',
  'today',
  'price',
  'qty',
  'avg',
  'cost',
  'weight',
  'xirr',
] as const;

export type HoldingsSortKey = (typeof HOLDINGS_SORT_KEYS)[number];
export type SortDir = 'asc' | 'desc';

export interface HoldingsSort {
  key: HoldingsSortKey;
  dir: SortDir;
}

export const DEFAULT_HOLDINGS_SORT: HoldingsSort = { key: 'mv', dir: 'desc' };

export function serializeHoldingsSort(sort: HoldingsSort): string {
  return JSON.stringify(sort);
}

/**
 * Parses the stored sort choice. Anything unexpected (missing, corrupt JSON, unknown
 * column, bad direction) falls back to market value descending instead of throwing.
 */
export function parseHoldingsSort(raw: string | undefined): HoldingsSort {
  if (raw === undefined) return DEFAULT_HOLDINGS_SORT;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_HOLDINGS_SORT;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return DEFAULT_HOLDINGS_SORT;
  }
  const { key, dir } = value as { key?: unknown; dir?: unknown };
  const validKey = HOLDINGS_SORT_KEYS.find((k) => k === key);
  if (validKey === undefined || (dir !== 'asc' && dir !== 'desc')) return DEFAULT_HOLDINGS_SORT;
  return { key: validKey, dir };
}
