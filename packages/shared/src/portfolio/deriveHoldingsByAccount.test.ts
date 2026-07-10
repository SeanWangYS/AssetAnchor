import { deriveHoldingsByAccount } from './deriveHoldings.js';
import { buildTransactionDoc } from '../transactions/buildTransactionDoc.js';
import type { Market } from '../enums/index.js';
import type { FirestoreTimestamp, TransactionDocument } from '../types/index.js';

const ts: FirestoreTimestamp = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };
let seq = 0;

interface TxOpts {
  symbol: string;
  market: Market;
  currency: 'USD' | 'TWD';
  quantity: string;
  price: string;
  accountId?: string;
  date?: string;
}

function tx(type: 'BUY' | 'SELL', opts: TxOpts): TransactionDocument {
  seq += 1;
  const doc = buildTransactionDoc(
    {
      account_id: opts.accountId ?? 'acc_1',
      symbol: opts.symbol,
      market: opts.market,
      asset_type: 'STOCK',
      transaction_type: type,
      transaction_date: opts.date ?? '2024-01-15',
      currency: opts.currency,
      quantity: opts.quantity,
      price: opts.price,
      fee: '0',
      tax: '0',
      notes: '',
    },
    { transactionId: `txn_${seq}` },
  );
  return { ...doc, created_at: ts, updated_at: ts };
}
const buy = (o: TxOpts) => tx('BUY', o);
const sell = (o: TxOpts) => tx('SELL', o);

const ACCOUNTS = [
  { account_id: 'acc_fs', account_name: 'Firstrade' },
  { account_id: 'acc_ce', account_name: '群益證券' },
];

describe('deriveHoldingsByAccount', () => {
  it('依真實 account_id 分流，各群只含該帳戶持倉', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_ce',
      }),
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '190',
        accountId: 'acc_fs',
      }),
    ];
    const groups = deriveHoldingsByAccount(txs, ACCOUNTS);
    expect(groups.map((g) => g.accountName)).toEqual(['Firstrade', '群益證券']);
    const fs = groups.find((g) => g.accountId === 'acc_fs')!;
    const ce = groups.find((g) => g.accountId === 'acc_ce')!;
    expect(fs.positions.map((p) => p.symbol)).toEqual(['AAPL']);
    expect(ce.positions.map((p) => p.symbol)).toEqual(['2330']);
  });

  it('群排序依傳入帳戶序', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '190',
        accountId: 'acc_fs',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_ce',
      }),
    ];
    // accounts 順序倒過來 → 群順序跟著倒
    const groups = deriveHoldingsByAccount(txs, [ACCOUNTS[1]!, ACCOUNTS[0]!]);
    expect(groups.map((g) => g.accountName)).toEqual(['群益證券', 'Firstrade']);
  });

  it('跨帳戶同 symbol：兩群各成一列、各自股數', () => {
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_ce',
      }),
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '500',
        price: '600',
        accountId: 'acc_fs',
      }),
    ];
    const groups = deriveHoldingsByAccount(txs, ACCOUNTS);
    const fs = groups.find((g) => g.accountId === 'acc_fs')!;
    const ce = groups.find((g) => g.accountId === 'acc_ce')!;
    expect(fs.positions.find((p) => p.symbol === '2330')!.quantity).toBe('500.0000000000');
    expect(ce.positions.find((p) => p.symbol === '2330')!.quantity).toBe('1000.0000000000');
  });

  it('orphan account_id（對不到現存帳戶）歸「未分類」群、殿後', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '190',
        accountId: 'acc_fs',
      }),
      buy({
        symbol: 'NVDA',
        market: 'US',
        currency: 'USD',
        quantity: '5',
        price: '100',
        accountId: 'ghost_deleted',
      }),
    ];
    const groups = deriveHoldingsByAccount(txs, ACCOUNTS);
    const last = groups[groups.length - 1]!;
    expect(last.accountName).toBe('未分類');
    expect(last.accountId).toBe('');
    expect(last.positions.map((p) => p.symbol)).toEqual(['NVDA']);
  });

  it('skipped：帳戶內某 symbol 超賣被跳過、其餘持倉照常回傳', () => {
    const txs = [
      buy({
        symbol: 'AAPL',
        market: 'US',
        currency: 'USD',
        quantity: '10',
        price: '190',
        accountId: 'acc_fs',
      }),
      // 超賣：買 5 賣 8 → 該 symbol fail-soft 跳過
      buy({
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        quantity: '5',
        price: '200',
        accountId: 'acc_fs',
        date: '2024-01-10',
      }),
      sell({
        symbol: 'TSLA',
        market: 'US',
        currency: 'USD',
        quantity: '8',
        price: '250',
        accountId: 'acc_fs',
        date: '2024-01-20',
      }),
    ];
    const groups = deriveHoldingsByAccount(txs, ACCOUNTS);
    const fs = groups.find((g) => g.accountId === 'acc_fs')!;
    expect(fs.positions.map((p) => p.symbol)).toEqual(['AAPL']);
    expect(fs.skipped).toEqual([{ market: 'US', symbol: 'TSLA' }]);
  });

  it('無交易 / 無帳戶 → 空集合，且無持倉的帳戶不成群', () => {
    expect(deriveHoldingsByAccount([], ACCOUNTS)).toEqual([]);
    const txs = [
      buy({
        symbol: '2330',
        market: 'TW',
        currency: 'TWD',
        quantity: '1000',
        price: '500',
        accountId: 'acc_ce',
      }),
    ];
    const groups = deriveHoldingsByAccount(txs, ACCOUNTS);
    // acc_fs 無交易 → 不出現；只有 acc_ce
    expect(groups.map((g) => g.accountId)).toEqual(['acc_ce']);
  });
});
