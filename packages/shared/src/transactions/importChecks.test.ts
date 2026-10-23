import {
  findDuplicates,
  findImportOversells,
  findNewOversells,
  transactionDuplicateKey,
  type ImportRow,
} from './importChecks.js';

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  account_id: 'acc-a',
  transaction_date: '2025-01-02',
  market: 'TW',
  symbol: '2330',
  transaction_type: 'BUY',
  currency: 'TWD',
  quantity: '1000.0000000000',
  price: '580.0000000000',
  ...over,
});

describe('transactionDuplicateKey', () => {
  it('normalizes numbers and symbol case', () => {
    expect(
      transactionDuplicateKey(row({ quantity: '1000', price: '580.00', symbol: '2330' })),
    ).toBe(transactionDuplicateKey(row()));
    expect(transactionDuplicateKey(row({ market: 'US', symbol: 'aapl', currency: 'USD' }))).toBe(
      transactionDuplicateKey(row({ market: 'US', symbol: 'AAPL', currency: 'USD' })),
    );
  });

  it('differs when any of the six fields differ', () => {
    const base = transactionDuplicateKey(row());
    for (const over of [
      { transaction_date: '2025-01-03' },
      { account_id: 'acc-b' },
      { symbol: '2317' },
      { transaction_type: 'SELL' as const },
      { quantity: '999' },
      { price: '581' },
    ]) {
      expect(transactionDuplicateKey(row(over))).not.toBe(base);
    }
  });
});

describe('findDuplicates', () => {
  it('flags rows matching existing transactions', () => {
    expect(
      findDuplicates([row()], [row({ quantity: '1000', price: '580' }), row({ price: '590' })]),
    ).toEqual([0]);
  });

  it('flags later copies within the same batch only', () => {
    expect(findDuplicates([], [row(), row({ price: '590' }), row()])).toEqual([2]);
  });
});

describe('findImportOversells', () => {
  it('reports a sell with nothing held', () => {
    expect(
      findImportOversells(
        [],
        [
          row({
            market: 'US',
            symbol: 'AAPL',
            currency: 'USD',
            transaction_type: 'SELL',
            quantity: '10',
          }),
        ],
      ),
    ).toEqual([{ index: 0, sellable: '0.0000000000', requested: '10.0000000000' }]);
  });

  it('accepts buy then sell in the same batch', () => {
    expect(
      findImportOversells(
        [],
        [
          row({ transaction_date: '2025-03-01', transaction_type: 'SELL', quantity: '10' }),
          row({ transaction_date: '2025-01-02', quantity: '10' }),
        ],
      ),
    ).toEqual([]);
  });

  it('accepts a same-day round trip listed sell-first', () => {
    expect(findImportOversells([], [row({ transaction_type: 'SELL' }), row()])).toEqual([]);
  });

  it('counts existing holdings and reports the shortfall', () => {
    expect(
      findImportOversells(
        [row({ quantity: '500' })],
        [row({ transaction_date: '2025-02-01', transaction_type: 'SELL', quantity: '800' })],
      ),
    ).toEqual([{ index: 0, sellable: '500.0000000000', requested: '800.0000000000' }]);
  });

  it('does not let holdings in another account or currency cover a sell', () => {
    const issues = findImportOversells(
      [
        row({ account_id: 'acc-b' }),
        row({ market: 'CRYPTO', symbol: 'BTC', currency: 'USD', quantity: '1' }),
      ],
      [
        row({ transaction_date: '2025-02-01', transaction_type: 'SELL' }),
        row({
          market: 'CRYPTO',
          symbol: 'BTC',
          currency: 'TWD',
          transaction_type: 'SELL',
          quantity: '1',
          transaction_date: '2025-02-01',
        }),
      ],
    );
    expect(issues.map((i) => i.index)).toEqual([0, 1]);
  });

  it('blames an earlier imported sell that starves a later existing sell', () => {
    const existing = [
      row({ quantity: '10' }),
      row({ transaction_date: '2025-03-01', transaction_type: 'SELL', quantity: '10' }),
    ];
    const issues = findImportOversells(existing, [
      row({ transaction_date: '2025-02-01', transaction_type: 'SELL', quantity: '4' }),
    ]);
    expect(issues).toEqual([{ index: 0, sellable: '0.0000000000', requested: '4.0000000000' }]);
  });

  it('ignores oversells that already exist without the import', () => {
    const existing = [row({ transaction_type: 'SELL', quantity: '5' })];
    expect(
      findImportOversells(existing, [row({ transaction_date: '2025-05-01', quantity: '1' })]),
    ).toEqual([]);
  });
});

describe('findNewOversells', () => {
  const t = (id: string, over: Partial<ImportRow> = {}) => ({ ...row(over), transaction_id: id });
  const buy = t('buy', { quantity: '1000' });
  const sell = t('sell', {
    transaction_date: '2025-03-01',
    transaction_type: 'SELL',
    quantity: '1000',
  });

  it('reports a later sell left uncovered by deleting a buy', () => {
    expect(findNewOversells([buy, sell], [sell])).toEqual([
      { transaction_id: 'sell', sellable: '0.0000000000', requested: '1000.0000000000' },
    ]);
  });

  it('never flags deleting a sell', () => {
    expect(findNewOversells([buy, sell], [buy])).toEqual([]);
  });

  it('reports shrinking a buy below later sells', () => {
    expect(findNewOversells([buy, sell], [{ ...buy, quantity: '400' }, sell])).toEqual([
      { transaction_id: 'sell', sellable: '400.0000000000', requested: '1000.0000000000' },
    ]);
  });

  it('reports moving a buy to another account', () => {
    expect(findNewOversells([buy, sell], [{ ...buy, account_id: 'acc-b' }, sell])).toHaveLength(1);
  });

  it('ignores oversells that already existed', () => {
    const broken = t('broken', { symbol: '2317', transaction_type: 'SELL', quantity: '5' });
    expect(
      findNewOversells([buy, sell, broken], [buy, sell, broken, t('new', { symbol: '2454' })]),
    ).toEqual([]);
  });
});
