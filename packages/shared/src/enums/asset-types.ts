export const ASSET_TYPES = Object.freeze([
  'STOCK',
  'ETF',
  'CRYPTO',
  'BOND',
  'MUTUAL_FUND',
  'OTHER',
] as const);

export type AssetType = (typeof ASSET_TYPES)[number];
