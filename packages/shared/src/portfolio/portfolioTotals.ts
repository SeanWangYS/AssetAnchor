import { Money } from '../money/index.js';
import { convertMoney } from '../fx/convertMoney.js';
import type { Currency } from '../enums/currencies.js';
import type { RateMap } from '../types/exchange-rate.js';
import type { Position } from './deriveHoldings.js';

/**
 * 將各 position 的 `totalCost`（原幣別）換算成 `to` 幣別後加總（ADR-0005 顯示時快照）。
 *
 * 純函式。`rates` 為 null（匯率未就緒）時回傳 null，由 UI 降級顯示「匯率未就緒」。
 * 同幣別 position 不需任何匯率即可加總。回傳 10 位小數 string（顯示層再 toDisplayString）。
 */
export function totalCostIn(
  positions: Position[],
  rates: RateMap | null,
  to: Currency,
): string | null {
  if (rates === null) return null;
  let sum = Money.zero(to);
  for (const p of positions) {
    sum = sum.add(convertMoney(Money.fromDecimalString(p.totalCost, p.currency), rates, to));
  }
  return sum.toDecimalString();
}
