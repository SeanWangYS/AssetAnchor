import { Money } from '../money/index.js';
import type { RateMap } from '../types/exchange-rate.js';

/**
 * Builds the six-key `RateMap` from a single USD/TWD close (1 USD = `usdTwd` TWD).
 * USDT is pegged 1:1 to USD, matching the exchange_rates write path
 * (enable-crypto-quotes D3). Shared by the trend series and portfolio returns so the
 * peg policy cannot drift between them.
 */
export function ratesFromUsdTwd(usdTwd: string): RateMap {
  const usdToTwd = new Money(usdTwd, 'TWD').toDecimalString();
  const twdToUsd = new Money('1', 'USD').divide(usdTwd).toDecimalString();
  const one = new Money('1', 'USD').toDecimalString();
  return {
    USD_TWD: usdToTwd,
    TWD_USD: twdToUsd,
    USDT_TWD: usdToTwd,
    TWD_USDT: twdToUsd,
    USDT_USD: one,
    USD_USDT: one,
  };
}
