import type { SymbolDocument } from '@assetanchor/shared';

export type SymbolRow = Pick<
  SymbolDocument,
  'symbol_id' | 'symbol' | 'market' | 'asset_type' | 'currency' | 'name' | 'name_zh'
>;

export const MAX_SYMBOL_CANDIDATES = 10;

/**
 * A symbol the quote source has resolved carries a name. App typos (US_APPL) leave shells whose
 * names stay empty; those must not reach Claude as candidates or as existing symbols.
 */
export function isResolvedSymbol(doc: { name?: string | undefined; name_zh?: string | undefined }) {
  return Boolean(doc.name?.trim() || doc.name_zh?.trim());
}

/** 0 = exact symbol, 1 = symbol prefix, 2 = name contains; null = no match. */
function matchRank(q: string, c: SymbolRow): number | null {
  const symbol = c.symbol.toUpperCase();
  const upper = q.toUpperCase();
  if (symbol === upper) return 0;
  if (symbol.startsWith(upper)) return 1;
  const lower = q.toLowerCase();
  if (c.name.toLowerCase().includes(lower) || c.name_zh.includes(q)) return 2;
  return null;
}

/**
 * Ranks candidate symbols for a query: exact symbol, then symbol prefix, then name substring
 * (Chinese or English). Ties sort by symbol id. At most 10 results; unresolved shells are dropped.
 */
export function rankSymbolCandidates(
  query: string,
  candidates: SymbolRow[],
  market?: string,
): SymbolRow[] {
  const q = query.trim();
  if (!q) return [];
  const seen = new Set<string>();
  const ranked: { rank: number; row: SymbolRow }[] = [];
  for (const c of candidates) {
    if (seen.has(c.symbol_id) || (market && c.market !== market) || !isResolvedSymbol(c)) continue;
    const rank = matchRank(q, c);
    if (rank === null) continue;
    seen.add(c.symbol_id);
    ranked.push({ rank, row: c });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.row.symbol_id.localeCompare(b.row.symbol_id))
    .slice(0, MAX_SYMBOL_CANDIDATES)
    .map((r) => r.row);
}
