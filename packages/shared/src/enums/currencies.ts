export const CURRENCIES = Object.freeze([
  // MVP
  'TWD',
  'USD',
  // Phase 2 reserved
  'JPY',
  'EUR',
  'HKD',
  'CNY',
] as const);

export type Currency = (typeof CURRENCIES)[number];
