export const TRANSACTION_TYPES = Object.freeze([
  // MVP
  'BUY',
  'SELL',
  // Phase 2
  'DIVIDEND_CASH',
  'DIVIDEND_STOCK',
  'SPLIT',
  'REVERSE_SPLIT',
  // Phase 3
  'SPINOFF',
  'MERGER',
  // Crypto (future)
  'STAKING_REWARD',
  'AIRDROP',
  'TRANSFER_IN',
  'TRANSFER_OUT',
] as const);

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
