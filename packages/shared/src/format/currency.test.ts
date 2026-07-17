import {
  amountDisplayDecimals,
  currencyPrefix,
  formatAmount,
  formatMoney,
  formatPrice,
  formatQuantity,
  signOf,
} from './currency.js';

describe('currencyPrefix', () => {
  it('TWD → NT$、USD → US$', () => {
    expect(currencyPrefix('TWD')).toBe('NT$');
    expect(currencyPrefix('USD')).toBe('US$');
  });

  it('其餘幣別回代碼（無尾空格）', () => {
    expect(currencyPrefix('USDT')).toBe('USDT');
  });
});

describe('amountDisplayDecimals', () => {
  it('TWD 0 位；USD/USDT/其他 2 位', () => {
    expect(amountDisplayDecimals('TWD')).toBe(0);
    expect(amountDisplayDecimals('USD')).toBe(2);
    expect(amountDisplayDecimals('USDT')).toBe(2);
  });
});

describe('formatAmount（裸數字、保留負號）', () => {
  it('TWD 0 位 + 千分位', () => {
    expect(formatAmount('1502136.0000000000', 'TWD')).toBe('1,502,136');
  });

  it('USD 2 位 + 千分位', () => {
    expect(formatAmount('24355.8000000000', 'USD')).toBe('24,355.80');
  });

  it('負值保留負號', () => {
    expect(formatAmount('-421749.0000000000', 'TWD')).toBe('-421,749');
  });

  it('零值依幣別小數位', () => {
    expect(formatAmount('0.0000000000', 'TWD')).toBe('0');
    expect(formatAmount('0.0000000000', 'USD')).toBe('0.00');
  });

  it('TWD 捨入 half-up 到 0 位', () => {
    expect(formatAmount('1234.5000000000', 'TWD')).toBe('1,235');
  });
});

describe('formatMoney（前綴 + 恆一空格）', () => {
  it('NT$ / US$', () => {
    expect(formatMoney('300450.0000000000', 'TWD')).toBe('NT$ 300,450');
    expect(formatMoney('1666.9500000000', 'USD')).toBe('US$ 1,666.95');
  });

  it('USDT 前綴恆一空格（不雙空格）', () => {
    expect(formatMoney('12.3400000000', 'USDT')).toBe('USDT 12.34');
  });
});

describe('formatPrice（單價/均價一律 2 位、含前綴）', () => {
  it('TWD 整數價也帶 2 位（規則表：不因幣別或整數省略）', () => {
    expect(formatPrice('590.0000000000', 'TWD')).toBe('NT$ 590.00');
  });

  it('TWD 均價不再取整（P2-2）', () => {
    expect(formatPrice('751.0680000000', 'TWD')).toBe('NT$ 751.07');
  });

  it('USD 保留尾零', () => {
    expect(formatPrice('512.3000000000', 'USD')).toBe('US$ 512.30');
  });

  it('千分位', () => {
    expect(formatPrice('2200.0000000000', 'TWD')).toBe('NT$ 2,200.00');
  });
});

describe('formatQuantity（≤4 位去尾零 + 千分位；與幣別無關）', () => {
  it('整數股', () => {
    expect(formatQuantity('1000.0000000000')).toBe('1,000');
  });

  it('零股去尾零', () => {
    expect(formatQuantity('2.5000000000')).toBe('2.5');
  });

  it('至多 4 位（half-up）', () => {
    expect(formatQuantity('0.1234550000')).toBe('0.1235');
  });

  it('非法輸入原樣回傳（防禦）', () => {
    expect(formatQuantity('abc')).toBe('abc');
  });
});

describe('signOf', () => {
  it('正 → up、負 → down、0 → flat', () => {
    expect(signOf(3.2)).toBe('up');
    expect(signOf(-0.01)).toBe('down');
    expect(signOf(0)).toBe('flat');
  });
});
