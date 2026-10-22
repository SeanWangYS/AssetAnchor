import type { SymbolMetaProvider } from '../../symbols/symbolMetaProvider';

/**
 * Deterministic stand-in for Yahoo in the integration-test emulators
 * (MCP_FAKE_SYMBOL_PROVIDER=true), so tests never touch the network.
 */
const KNOWN: Record<string, { longName: string }> = {
  US_AAPL: { longName: 'Apple Inc.' },
  US_VT: { longName: 'Vanguard Total World Stock ETF' },
  US_TSM: { longName: 'Taiwan Semiconductor Manufacturing' },
  TW_0056: { longName: 'Yuanta Taiwan High Dividend' },
};

export const fakeSymbolMetaProvider: SymbolMetaProvider = {
  name: 'fake',
  async fetch(market, symbol) {
    return KNOWN[`${market}_${symbol}`] ?? null;
  },
};
