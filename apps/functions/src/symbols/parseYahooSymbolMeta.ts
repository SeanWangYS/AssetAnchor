import type { RawSymbolMeta } from '@assetanchor/shared';

/**
 * 把 Yahoo 的巢狀回應攤平為 `RawSymbolMeta` 候選欄位（純函式，可測，不打外網）。
 * 整形 / 擇優（longName>shortName）/ 長度上限交由 shared `normalizeSymbolMeta`。
 */

function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
}

function firstDefined(...vals: unknown[]): unknown {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

/** 只納入有值（非 null/undefined）的候選欄位，避免污染 toEqual / 後續整形。 */
function build(fields: Record<string, unknown>): RawSymbolMeta {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as RawSymbolMeta;
}

/** quoteSummary（modules=price,assetProfile,quoteType）→ RawSymbolMeta；result 缺/空回 null。 */
export function parseQuoteSummaryMeta(json: unknown): RawSymbolMeta | null {
  const arr = obj(obj(json)?.quoteSummary)?.result;
  const first = Array.isArray(arr) ? obj(arr[0]) : undefined;
  if (!first) return null;
  const price = obj(first.price) ?? {};
  const profile = obj(first.assetProfile) ?? {};
  const quoteType = obj(first.quoteType) ?? {};
  return build({
    longName: firstDefined(price.longName, quoteType.longName),
    shortName: firstDefined(price.shortName, quoteType.shortName),
    exchange: firstDefined(price.exchangeName, quoteType.exchange),
    industry: profile.industry,
    sector: profile.sector,
  });
}

/** chart v8 端點的 meta（退化 fallback）→ RawSymbolMeta（無 industry/sector）；meta 缺回 null。 */
export function parseChartMeta(json: unknown): RawSymbolMeta | null {
  const arr = obj(obj(json)?.chart)?.result;
  const first = Array.isArray(arr) ? obj(arr[0]) : undefined;
  const meta = obj(first?.meta);
  if (!meta) return null;
  return build({
    longName: meta.longName,
    shortName: meta.shortName,
    exchange: firstDefined(meta.fullExchangeName, meta.exchangeName),
  });
}
