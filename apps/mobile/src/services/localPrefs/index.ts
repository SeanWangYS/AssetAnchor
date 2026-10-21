import { createMMKV } from 'react-native-mmkv';
import { parseHoldingsSort, serializeHoldingsSort, type HoldingsSort } from './holdingsSort';

export * from './holdingsSort';

/**
 * Device-local preferences (MMKV, never written to Firestore). One storage instance
 * for all local UI preferences; the quote cache from ADR-0006 would get its own id.
 */
const storage = createMMKV({ id: 'assetanchor.local-prefs' });

const HOLDINGS_SORT_KEY = 'holdings.sort';

export function readHoldingsSort(): HoldingsSort {
  return parseHoldingsSort(storage.getString(HOLDINGS_SORT_KEY));
}

export function writeHoldingsSort(sort: HoldingsSort): void {
  storage.set(HOLDINGS_SORT_KEY, serializeHoldingsSort(sort));
}
