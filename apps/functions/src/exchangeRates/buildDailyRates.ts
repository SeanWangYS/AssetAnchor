import { Money } from '@assetanchor/shared';

/**
 * 由 `TWD=X` 市場價（1 USD = N TWD）組每日 `exchange_rates.rates` map（純函式，可測）。
 *
 * - `USD_TWD` 為來源值、`TWD_USD` 預存倒數（互為倒數，省顯示層計算）。
 * - USDT 四鍵以 **1:1 釘 USD** 衍生（enable-crypto-quotes design D3）：peg 是資料政策、
 *   特判收斂在產資料的單一位置；shared `convertMoney` 維持純查表 + 缺 key fail loud。
 * - 全部值為 `Money` 10 位小數 string（ADR-0005）。
 */
export function buildDailyRates(rate: string): Record<string, string> {
  const usdTwd = new Money(rate, 'TWD').toDecimalString();
  const twdUsd = new Money('1', 'TWD').divide(rate).toDecimalString();
  const one = new Money('1', 'USD').toDecimalString();

  return {
    USD_TWD: usdTwd,
    TWD_USD: twdUsd,
    USDT_TWD: usdTwd,
    TWD_USDT: twdUsd,
    USDT_USD: one,
    USD_USDT: one,
  };
}
