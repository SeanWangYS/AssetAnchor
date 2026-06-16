import type { Currency } from '../enums/currencies.js';

/**
 * 設定頁支援的顯示幣別（MVP：跨幣別合計顯示用），是 `Currency` 的子集。
 * 與 holdings / analysis 的 TWD/USD 切換一致；新增顯示幣別時於此單點擴充。
 */
export const DISPLAY_CURRENCIES = Object.freeze(['TWD', 'USD'] as const);

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

// 編譯期保證 DisplayCurrency 仍是 Currency 的子集（schema 對齊）。
const _assertSubset: readonly Currency[] = DISPLAY_CURRENCIES;
void _assertSubset;

/** 型別守衛：值是否為設定頁支援的顯示幣別（拒絕合法但不支援的 Currency 與任意字串）。 */
export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === 'string' && (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}
