import { transactionTotalWithFees } from './transactionTotalWithFees.js';

/** 快速建 minimal 輸入（10 位小數 canonical string 與 Firestore 一致）。 */
function tx(
  type: 'BUY' | 'SELL',
  total: string,
  fee: string,
  tax: string,
): Parameters<typeof transactionTotalWithFees>[0] {
  return { transaction_type: type, total, fee, tax, currency: 'USD' };
}

describe('transactionTotalWithFees（顯示口徑：含手續費與稅）', () => {
  it('BUY = total + fee + tax（visual-audit P1-1 驗收例：5,123 + 1 = 5,124）', () => {
    expect(
      transactionTotalWithFees(tx('BUY', '5123.0000000000', '1.0000000000', '0.0000000000')),
    ).toBe('5124.0000000000');
  });

  it('BUY 含稅：total + fee + tax 三項齊加', () => {
    expect(
      transactionTotalWithFees(tx('BUY', '100000.0000000000', '20.0000000000', '85.0000000000')),
    ).toBe('100105.0000000000');
  });

  it('SELL = total − fee − tax（台股賣出含證交稅）', () => {
    expect(
      transactionTotalWithFees(
        tx('SELL', '500000.0000000000', '712.0000000000', '1500.0000000000'),
      ),
    ).toBe('497788.0000000000');
  });

  it('SELL 淨額可為負（fee+tax > 成交金額的極端小額賣出，照實回傳）', () => {
    expect(
      transactionTotalWithFees(tx('SELL', '2.0000000000', '3.0000000000', '2.0000000000')),
    ).toBe('-3.0000000000');
  });

  it('fee/tax 為 0 時 = total（與既有清單顯示相容）', () => {
    expect(
      transactionTotalWithFees(tx('BUY', '910000.0000000000', '0.0000000000', '0.0000000000')),
    ).toBe('910000.0000000000');
  });

  it('缺值 fail-soft：fee/tax 為 undefined（pre-ADR-0005 舊 doc）視為 0', () => {
    expect(
      transactionTotalWithFees({
        transaction_type: 'BUY',
        total: '5123.0000000000',
        fee: undefined as unknown as string,
        tax: undefined as unknown as string,
        currency: 'USD',
      }),
    ).toBe('5123.0000000000');
  });

  it('資料損毀 fail-loud：present-but-invalid 字串擲錯（ADR-0007 §5b，不靜默歸零）', () => {
    expect(() => transactionTotalWithFees(tx('BUY', '5123.0000000000', 'garbage', '0'))).toThrow();
  });

  it('TWD 幣別同樣運作', () => {
    expect(
      transactionTotalWithFees({
        transaction_type: 'BUY',
        total: '590000.0000000000',
        fee: '840.0000000000',
        tax: '0.0000000000',
        currency: 'TWD',
      }),
    ).toBe('590840.0000000000');
  });
});
