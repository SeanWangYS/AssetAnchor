import { Money } from '../money/index.js';
import type { Currency } from '../enums/currencies.js';
import type { RateMap } from '../types/exchange-rate.js';

/**
 * 顯示時 FX 換算（ADR-0005：換算只發生在顯示/分析層、用最新匯率、不落地）。
 *
 * 給定原幣別 `Money` + `exchange_rates.rates` map + 目標幣別，回傳換算後的
 * `Money`（10 位小數）。同幣別原值回傳。缺對應匯率（`{FROM}_{TO}` key）時 fail
 * loud——不得用錯誤或臆測匯率靜默換算。純函式、deterministic、不依賴 Firestore / React。
 */
export function convertMoney(amount: Money, rates: RateMap, to: Currency): Money {
  if (amount.currency === to) return amount;

  const key = `${amount.currency}_${to}`;
  const rate = rates[key];
  if (rate === undefined) {
    throw new Error(`exchange rate missing for ${key}`);
  }

  // multiply 回傳同幣別 Money；以 10 位小數 string 重新標記為目標幣別。
  return new Money(amount.multiply(rate).toDecimalString(), to);
}
