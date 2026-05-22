export const MARKETS = Object.freeze(['TW', 'US', 'CRYPTO', 'OTHER'] as const);

export type Market = (typeof MARKETS)[number];
