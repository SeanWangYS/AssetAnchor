import { BROKERS, type Broker } from './brokers.js';
import { ACCOUNT_TYPES, type AccountType } from './account-types.js';
import { ASSET_TYPES, type AssetType } from './asset-types.js';
import { TRANSACTION_TYPES, type TransactionType } from './transaction-types.js';
import { CURRENCIES, type Currency } from './currencies.js';
import { MARKETS, type Market } from './markets.js';

describe('BROKERS enum', () => {
  it('contains all US brokers from planning doc §6', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining([
        'FIRSTRADE',
        'INTERACTIVE_BROKERS',
        'MOOMOO',
        'SCHWAB',
        'FIDELITY',
        'ROBINHOOD',
        'TD_AMERITRADE',
      ]),
    );
  });

  it('contains all TW brokers from planning doc §6', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining([
        'CAPITAL_SECURITIES',
        'SINOPAC',
        'FUBON',
        'YUANTA',
        'CATHAY',
        'CTBC',
        'MASTERLINK',
        'KGI',
        'MEGA',
      ]),
    );
  });

  it('contains crypto exchanges and OTHER', () => {
    expect(BROKERS).toEqual(
      expect.arrayContaining(['BINANCE', 'COINBASE', 'KRAKEN', 'MAX', 'BITOPRO', 'OTHER']),
    );
  });

  it('is a readonly tuple (frozen)', () => {
    expect(Object.isFrozen(BROKERS)).toBe(true);
  });

  it('Broker type accepts known values', () => {
    const b: Broker = 'FIRSTRADE';
    expect(BROKERS.includes(b)).toBe(true);
  });
});

describe('ACCOUNT_TYPES enum', () => {
  it('matches planning doc §6 list', () => {
    expect(ACCOUNT_TYPES).toEqual([
      'BROKERAGE',
      'IRA',
      'MARGIN',
      'CASH',
      'CRYPTO_EXCHANGE',
      'CRYPTO_WALLET',
      'OTHER',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNT_TYPES)).toBe(true);
  });

  it('AccountType type works', () => {
    const t: AccountType = 'BROKERAGE';
    expect(ACCOUNT_TYPES.includes(t)).toBe(true);
  });
});

describe('ASSET_TYPES enum', () => {
  it('matches planning doc §6 list', () => {
    expect(ASSET_TYPES).toEqual(['STOCK', 'ETF', 'CRYPTO', 'BOND', 'MUTUAL_FUND', 'OTHER']);
  });

  it('AssetType type works', () => {
    const t: AssetType = 'STOCK';
    expect(ASSET_TYPES.includes(t)).toBe(true);
  });
});

describe('TRANSACTION_TYPES enum', () => {
  it('contains MVP types', () => {
    expect(TRANSACTION_TYPES).toEqual(expect.arrayContaining(['BUY', 'SELL']));
  });

  it('contains corporate-action types (phase 2/3)', () => {
    expect(TRANSACTION_TYPES).toEqual(
      expect.arrayContaining([
        'DIVIDEND_CASH',
        'DIVIDEND_STOCK',
        'SPLIT',
        'REVERSE_SPLIT',
        'SPINOFF',
        'MERGER',
      ]),
    );
  });

  it('contains crypto types (future)', () => {
    expect(TRANSACTION_TYPES).toEqual(
      expect.arrayContaining(['STAKING_REWARD', 'AIRDROP', 'TRANSFER_IN', 'TRANSFER_OUT']),
    );
  });

  it('TransactionType type works', () => {
    const t: TransactionType = 'BUY';
    expect(TRANSACTION_TYPES.includes(t)).toBe(true);
  });

  it('matches the full whitelist exactly (no accidental additions)', () => {
    expect(TRANSACTION_TYPES).toEqual([
      'BUY',
      'SELL',
      'DIVIDEND_CASH',
      'DIVIDEND_STOCK',
      'SPLIT',
      'REVERSE_SPLIT',
      'SPINOFF',
      'MERGER',
      'STAKING_REWARD',
      'AIRDROP',
      'TRANSFER_IN',
      'TRANSFER_OUT',
    ]);
  });
});

describe('CURRENCIES enum', () => {
  it('contains MVP currencies', () => {
    expect(CURRENCIES).toEqual(expect.arrayContaining(['TWD', 'USD']));
  });

  it('reserves slots for phase 2 currencies', () => {
    expect(CURRENCIES).toEqual(expect.arrayContaining(['JPY', 'EUR', 'HKD', 'CNY']));
  });

  it('Currency type works', () => {
    const c: Currency = 'TWD';
    expect(CURRENCIES.includes(c)).toBe(true);
  });

  it('matches the full whitelist exactly (no accidental additions)', () => {
    expect(CURRENCIES).toEqual(['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY']);
  });
});

describe('MARKETS enum', () => {
  it('matches planning doc §6 list (strict whitelist)', () => {
    expect(MARKETS).toEqual(['TW', 'US', 'CRYPTO', 'OTHER']);
  });

  it('Market type works', () => {
    const m: Market = 'TW';
    expect(MARKETS.includes(m)).toBe(true);
  });
});

describe('all enums are runtime-frozen', () => {
  it.each([
    ['BROKERS', BROKERS],
    ['ACCOUNT_TYPES', ACCOUNT_TYPES],
    ['ASSET_TYPES', ASSET_TYPES],
    ['TRANSACTION_TYPES', TRANSACTION_TYPES],
    ['CURRENCIES', CURRENCIES],
    ['MARKETS', MARKETS],
  ])('%s is Object.frozen', (_name, enumArray) => {
    expect(Object.isFrozen(enumArray)).toBe(true);
  });
});
