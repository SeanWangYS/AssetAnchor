import { cashTotalsByCurrency, formatCashTotals } from './accountDisplay';
import type { AccountDocument, CashBalances } from '@assetanchor/shared';

const ts = { seconds: 0, nanoseconds: 0, toDate: () => new Date(0) };

/** 最小帳戶 fixture（只填現金總計相關欄位，其餘以合理預設補齊）。 */
function account(cash: CashBalances, opts: { isActive?: boolean } = {}): AccountDocument {
  return {
    account_id: `acc_${Math.random().toString(36).slice(2)}`,
    account_name: 'Test',
    broker: 'OTHER',
    account_type: 'BROKERAGE',
    base_currency: 'TWD',
    market: 'TW',
    cash_balances: cash,
    cash_balances_updated_at: ts,
    is_active: opts.isActive ?? true,
    display_order: 1,
    color: '#fff',
    notes: '',
    created_at: ts,
    updated_at: ts,
  };
}

describe('cashTotalsByCurrency', () => {
  it('sums cash across accounts per currency with Money precision', () => {
    const sums = cashTotalsByCurrency([
      account({ TWD: '200000.0000000000', USD: '3000.4200000000' }),
      account({ TWD: '22200.0000000000', USD: '130.0000000000' }),
    ]);
    expect(sums.get('TWD')?.toDecimalString()).toBe('222200.0000000000');
    expect(sums.get('USD')?.toDecimalString()).toBe('3130.4200000000');
  });

  it('excludes inactive accounts', () => {
    const sums = cashTotalsByCurrency([
      account({ TWD: '100.0000000000' }),
      account({ TWD: '999.0000000000' }, { isActive: false }),
    ]);
    expect(sums.get('TWD')?.toDecimalString()).toBe('100.0000000000');
  });

  it('omits currencies whose total is zero', () => {
    const sums = cashTotalsByCurrency([account({ TWD: '0.0000000000', USD: '50.0000000000' })]);
    expect(sums.has('TWD')).toBe(false);
    expect(sums.get('USD')?.toDecimalString()).toBe('50.0000000000');
  });
});

describe('formatCashTotals', () => {
  // 排版（前綴、分隔、千分位）以 Money.toDisplayString（canonical 2 位小數、無千分位）為準；
  // 確切千分位/排版屬 owner 視覺對圖時對齊 mock 的決定（spec 不綁死）。
  it('formats per-currency totals, TWD first then USD', () => {
    expect(formatCashTotals([account({ TWD: '222200.0000000000', USD: '3130.4200000000' })])).toBe(
      'NT$ 222200.00 · US$ 3130.42',
    );
  });

  it('shows only currencies with a balance', () => {
    expect(formatCashTotals([account({ TWD: '50000.0000000000' })])).toBe('NT$ 50000.00');
  });

  it('falls back to NT$ 0.00 when no account has cash', () => {
    expect(formatCashTotals([account({})])).toBe('NT$ 0.00');
    expect(formatCashTotals([])).toBe('NT$ 0.00');
  });
});
