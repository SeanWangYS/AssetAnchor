export const ACCOUNT_TYPES = Object.freeze([
  'BROKERAGE',
  'IRA',
  'MARGIN',
  'CASH',
  'CRYPTO_EXCHANGE',
  'CRYPTO_WALLET',
  'OTHER',
] as const);

export type AccountType = (typeof ACCOUNT_TYPES)[number];
