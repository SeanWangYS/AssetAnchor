/**
 * aNice — Heckbert-style "nice number" for chart axis ceilings.
 *
 * Given a max value `value`, returns the smallest aesthetically "nice" number
 * that is >= `value`, snapped to the ladder
 * `[1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]` scaled by the relevant power of ten.
 *
 * Use case: deriving the top gridline of the analysis-page bar charts (e.g. a
 * top holding of ~110_000 yields a 120_000 ceiling; the chart then draws
 * half-grid labels at `aNice(max) * 0.5`). See the design prototype
 * `docs/design/analysis-page/prototype/aa-analysis-charts.jsx` (`aNice`).
 *
 * This is a DISPLAY / charting helper, not money: plain `number` is correct here
 * (no Money / decimal). Pure, deterministic, no React / Firestore dependency.
 *
 * Edge handling (hardened beyond the prototype's naive form, where `log10(0)`
 * would yield `NaN`): a non-finite or non-positive input returns `0`, so an
 * empty or all-zero chart degrades to a flat baseline instead of `NaN`.
 */
const LADDER = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8] as const;
const TOP_RUNG = 10;

export function aNice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const mantissa = value / power;
  for (const rung of LADDER) {
    if (mantissa <= rung) return rung * power;
  }
  // mantissa is in [1, 10) by construction, so anything not caught above
  // (e.g. exactly 10, or a floating-point nudge past 8) snaps to the next decade.
  return TOP_RUNG * power;
}
