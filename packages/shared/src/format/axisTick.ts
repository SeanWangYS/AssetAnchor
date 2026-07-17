import type { Currency } from '../enums/currencies.js';

/**
 * 圖表軸刻度的緊湊數字（visual-audit P2-13b——修「5000K」錯層）：
 * TWD 用中文慣用萬/億層、其他幣別（USD/USDT…）用 K/M 層。
 * 以絕對值判層（負軸極值也要進層，符號另掛回）；toFixed(1) 去尾零；
 * **先捨後升層**：萬層捨入到 ≥10000 直接進億（99,999,999 → 「1億」非「10000萬」），
 * 整數捨入到基層門檻亦升層（9,999.6 → 「1萬」）。
 * 顯示層純函式（chart 出圖已是 toNumber 逃生門，ADR-0005 允許）。
 */
export function formatAxisTick(v: number, currency: Currency): string {
  const units: readonly { unit: number; suffix: string }[] =
    currency === 'TWD'
      ? [
          { unit: 1e8, suffix: '億' },
          { unit: 1e4, suffix: '萬' },
        ]
      : [
          { unit: 1e6, suffix: 'M' },
          { unit: 1e3, suffix: 'K' },
        ];

  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);

  for (let i = 0; i < units.length; i++) {
    const cur = units[i];
    if (!cur) continue;
    if (abs >= cur.unit || Math.round(abs) >= cur.unit) {
      const k = Number((abs / cur.unit).toFixed(1));
      const upper = units[i - 1];
      // 先捨後判：本層捨入值衝到上一層門檻 → 升層。
      if (upper && k >= upper.unit / cur.unit) {
        return `${sign}${trim(abs / upper.unit)}${upper.suffix}`;
      }
      return `${sign}${trim(abs / cur.unit)}${cur.suffix}`;
    }
  }
  return `${sign}${Math.round(abs)}`;
}

/** toFixed(1) 去尾零（float 語意；邊界值 pin 於測試）。 */
function trim(x: number): string {
  return x.toFixed(1).replace(/\.0$/, '');
}
