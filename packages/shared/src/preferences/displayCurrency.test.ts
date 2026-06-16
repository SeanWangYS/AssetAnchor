import { DISPLAY_CURRENCIES, isDisplayCurrency, type DisplayCurrency } from './displayCurrency.js';

describe('DISPLAY_CURRENCIES', () => {
  it('is the MVP display set TWD / USD', () => {
    expect(DISPLAY_CURRENCIES).toEqual(['TWD', 'USD']);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DISPLAY_CURRENCIES)).toBe(true);
  });

  it('DisplayCurrency type accepts known values', () => {
    const c: DisplayCurrency = 'TWD';
    expect(DISPLAY_CURRENCIES.includes(c)).toBe(true);
  });
});

describe('isDisplayCurrency', () => {
  it('accepts TWD and USD', () => {
    expect(isDisplayCurrency('TWD')).toBe(true);
    expect(isDisplayCurrency('USD')).toBe(true);
  });

  it('rejects a valid Currency that is not a display currency', () => {
    expect(isDisplayCurrency('JPY')).toBe(false);
    expect(isDisplayCurrency('EUR')).toBe(false);
  });

  it('rejects arbitrary / malformed strings', () => {
    expect(isDisplayCurrency('')).toBe(false);
    expect(isDisplayCurrency('twd')).toBe(false);
    expect(isDisplayCurrency('NTD')).toBe(false);
  });
});
