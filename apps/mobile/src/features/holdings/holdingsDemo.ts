import {
  amountDisplayDecimals,
  currencyPrefix as sharedCurrencyPrefix,
  formatQuantity,
  type Currency,
  type Market,
} from '@assetanchor/shared';

// toDisplay lives in services/valuation (change account-detail-market-value);
// re-exported here to keep the existing `import { toDisplay } from '../holdingsDemo'` working.
export { toDisplay } from '../../services/valuation';

/**
 * Small display helpers shared by the holdings screens.
 *
 * The former demo/mock quote layer (mock returns, mock market value, avatar
 * colours, DEMO_SUMMARY) has been removed: all values now come from real
 * holdings, quotes and symbol metadata.
 */

export function marketLabel(market: Market): string {
  if (market === 'TW') return '台股';
  if (market === 'US') return '美股';
  if (market === 'CRYPTO') return '加密貨幣';
  return '其他';
}

/**
 * Adapter only: the single source of formatting rules is the `packages/shared`
 * format module; these delegates must not contain any formatting rules.
 * @deprecated Screens should import from shared directly (backlog: delete shim).
 */
export function currencyPrefix(currency: Currency): string {
  return sharedCurrencyPrefix(currency);
}

/** @deprecated Same as above. */
export function displayDecimals(currency: Currency): number {
  return amountDisplayDecimals(currency);
}

/** Share quantity display (trims trailing zeros to <=4 dp, adds thousands separators; currency is ignored, kept for signature compatibility). */
export function fmtShares(quantity: string, _currency: Currency): string {
  return formatQuantity(quantity);
}
