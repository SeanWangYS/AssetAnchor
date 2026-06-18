import type { SymbolDocument } from '../types/symbol.js';

/**
 * 外部資料源（Yahoo quoteSummary / chart meta）攤平後的候選欄位（整形前；型別未知）。
 * functions provider 負責把各源的巢狀 JSON 攤平成本介面，整形/擇優邏輯集中於本檔（可單元測試）。
 */
export interface RawSymbolMeta {
  /** 完整名稱（優先），如 "Taiwan Semiconductor"。 */
  longName?: unknown;
  /** 簡稱（longName 缺時 fallback），如 "TSMC"。 */
  shortName?: unknown;
  /** 中文名（best-effort；多數源不穩定）。 */
  nameZh?: unknown;
  exchange?: unknown;
  industry?: unknown;
  sector?: unknown;
}

/** 整形後的 metadata patch（`SymbolDocument` 子集；僅含有效欄位，缺值不納入以免覆寫既有）。 */
export type SymbolMetaPatch = Partial<
  Pick<SymbolDocument, 'name' | 'name_zh' | 'exchange' | 'industry' | 'sector'>
>;

/** 名稱類欄位長度上限（防禦髒資料 / 異常超長）。 */
const MAX_NAME = 120;
/** 交易所代號長度上限。 */
const MAX_EXCHANGE = 40;

/** 字串欄位整形：非字串 / 全空白 → undefined；否則 trim 並截斷至上限。 */
function clean(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/**
 * 把外部 raw metadata 整形為 `SymbolMetaPatch`（純函式、無 IO）。
 * - name：longName 優先、退 shortName；兩者皆缺則不納入。
 * - name_zh/exchange/industry/sector：各自 clean；缺值不納入（避免以空值覆寫既有）。
 * 缺值或非字串安全降級，不拋例外。
 */
export function normalizeSymbolMeta(raw: RawSymbolMeta): SymbolMetaPatch {
  const patch: SymbolMetaPatch = {};

  const name = clean(raw.longName, MAX_NAME) ?? clean(raw.shortName, MAX_NAME);
  if (name !== undefined) patch.name = name;

  const nameZh = clean(raw.nameZh, MAX_NAME);
  if (nameZh !== undefined) patch.name_zh = nameZh;

  const exchange = clean(raw.exchange, MAX_EXCHANGE);
  if (exchange !== undefined) patch.exchange = exchange;

  const industry = clean(raw.industry, MAX_NAME);
  if (industry !== undefined) patch.industry = industry;

  const sector = clean(raw.sector, MAX_NAME);
  if (sector !== undefined) patch.sector = sector;

  return patch;
}

/**
 * 解析顯示名稱（純函式）：繁中畫面優先 `name_zh`，缺則 `name`，再缺則 raw symbol。
 * 全空白名稱視為缺值。meta 可為 undefined / null（尚未 enrich）。
 */
export function symbolDisplayName(
  meta: { name?: string; name_zh?: string } | null | undefined,
  rawSymbol: string,
): string {
  const zh = meta?.name_zh?.trim();
  if (zh) return zh;
  const en = meta?.name?.trim();
  if (en) return en;
  return rawSymbol;
}
