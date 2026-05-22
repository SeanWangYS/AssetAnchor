export const BROKERS = Object.freeze([
  // 美股 / 國際
  'FIRSTRADE',
  'INTERACTIVE_BROKERS',
  'MOOMOO',
  'SCHWAB',
  'FIDELITY',
  'ROBINHOOD',
  'TD_AMERITRADE',
  // 台股
  'CAPITAL_SECURITIES',
  'SINOPAC',
  'FUBON',
  'YUANTA',
  'CATHAY',
  'CTBC',
  'MASTERLINK',
  'KGI',
  'MEGA',
  // 加密貨幣
  'BINANCE',
  'COINBASE',
  'KRAKEN',
  'MAX',
  'BITOPRO',
  'OTHER',
] as const);

export type Broker = (typeof BROKERS)[number];
