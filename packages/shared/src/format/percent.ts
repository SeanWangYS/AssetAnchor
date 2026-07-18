/**
 * 百分比顯示政策（visual-audit P3-2 / P3-3 / P3-4；spec: currency-display / analysis）。
 * 報酬率預設 2 位帶 +/−（U+2212）；佔比 1 位不帶號、經 largest-remainder 使加總恆 100。
 */

export interface FormatPercentOptions {
  /** 小數位（報酬率 2、佔比 1）。 */
  decimals?: number;
  /** 帶正負號（+ / U+2212 −）；false 回絕對值字串（Pnl display 用）。 */
  signed?: boolean;
}

/** 百分比字串；捨入後為 0 一律不帶號（零值中性，P2-4 家族）。 */
export function formatPercent(pct: number, options: FormatPercentOptions = {}): string {
  const { decimals = 2, signed = true } = options;
  const abs = Math.abs(pct).toFixed(decimals);
  const isZero = Number(abs) === 0;
  const body = `${abs}%`;
  if (!signed || isZero) return body;
  return `${pct > 0 ? '+' : '−'}${body}`;
}

/**
 * Largest-remainder（Hamilton）：把權重轉為 `decimals` 位百分比，**顯示值加總恆為 100**
 * （P3-4——取代「先捨後加 99.9%」）。輸入為原始權重（自動正規化）；空陣列回空、
 * 全零回全零（無可分配）；負權重 throw（佔比語意無負值）。
 *
 * Alternatives considered：「最後一項 = 100 − 其餘和」——殘差全砸單一項、小佔比項
 * 可能失真成 0.0% 或負值；largest-remainder 每項誤差有界（< 1 quantum）。
 */
export function allocatePercentages(weights: readonly number[], decimals = 1): number[] {
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0 || !Number.isFinite(w))) {
    throw new Error(`allocatePercentages: weights must be finite and non-negative`);
  }
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return weights.map(() => 0);

  const quantum = 10 ** decimals; // 每 1% 的顯示格數（decimals=1 → 0.1% 一格）
  const targetUnits = 100 * quantum;
  const exact = weights.map((w) => (w / total) * targetUnits);
  const floors = exact.map(Math.floor);
  let remainder = targetUnits - floors.reduce((a, b) => a + b, 0);

  // 依小數餘量由大到小補格（穩定：同餘量保持原順序）。
  const order = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const units = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    units[i] = (units[i] ?? 0) + 1;
    remainder -= 1;
  }
  return units.map((u) => u / quantum);
}
