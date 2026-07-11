export const CURRENCIES = Object.freeze([
  // MVP（USDT＝crypto 交易/記帳幣別，換算 1:1 釘 USD；enable-crypto-quotes）
  'TWD',
  'USD',
  'USDT',
  // Phase 2 reserved
  'JPY',
  'EUR',
  'HKD',
  'CNY',
] as const);

export type Currency = (typeof CURRENCIES)[number];
