import { Money } from './money.js';
import { CurrencyMismatchError, DivisionByZeroError } from './errors.js';

describe('Money constructor', () => {
  it('accepts string value', () => {
    const m = new Money('1234.56', 'TWD');
    expect(m.currency).toBe('TWD');
    expect(m.toDecimalString()).toBe('1234.5600000000');
  });

  it('accepts number value', () => {
    const m = new Money(1234.56, 'USD');
    expect(m.toDecimalString()).toBe('1234.5600000000');
  });

  it('handles very small fractional values without float drift', () => {
    const m = new Money('0.1', 'TWD').add(new Money('0.2', 'TWD'));
    expect(m.toDecimalString()).toBe('0.3000000000');
  });

  it('handles trailing zeros consistently', () => {
    expect(new Money('100', 'USD').toDecimalString()).toBe('100.0000000000');
  });

  it('throws on invalid string', () => {
    expect(() => new Money('not-a-number', 'USD')).toThrow();
  });
});

describe('Money.add', () => {
  it('adds same-currency values', () => {
    const a = new Money('100.50', 'TWD');
    const b = new Money('200.25', 'TWD');
    expect(a.add(b).toDecimalString()).toBe('300.7500000000');
  });

  it('is immutable (does not mutate operands)', () => {
    const a = new Money('100', 'TWD');
    const b = new Money('50', 'TWD');
    a.add(b);
    expect(a.toDecimalString()).toBe('100.0000000000');
    expect(b.toDecimalString()).toBe('50.0000000000');
  });

  it('throws CurrencyMismatchError when currencies differ', () => {
    const a = new Money('100', 'TWD');
    const b = new Money('100', 'USD');
    expect(() => a.add(b)).toThrow(CurrencyMismatchError);
  });

  it('accumulating 1000 × 0.1 equals exactly 100', () => {
    let total = Money.zero('USD');
    for (let i = 0; i < 1000; i += 1) {
      total = total.add(new Money('0.1', 'USD'));
    }
    expect(total.toDecimalString()).toBe('100.0000000000');
  });
});

describe('Money.subtract', () => {
  it('subtracts same-currency values', () => {
    const a = new Money('100', 'USD');
    const b = new Money('30.5', 'USD');
    expect(a.subtract(b).toDecimalString()).toBe('69.5000000000');
  });

  it('produces negative when right > left', () => {
    const a = new Money('30', 'USD');
    const b = new Money('100', 'USD');
    expect(a.subtract(b).toDecimalString()).toBe('-70.0000000000');
  });

  it('throws CurrencyMismatchError when currencies differ', () => {
    expect(() => new Money('100', 'TWD').subtract(new Money('1', 'USD'))).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('Money.multiply', () => {
  it('multiplies by integer factor', () => {
    expect(new Money('10.5', 'USD').multiply(3).toDecimalString()).toBe('31.5000000000');
  });

  it('multiplies by decimal string factor', () => {
    expect(new Money('100', 'TWD').multiply('0.001425').toDecimalString()).toBe('0.1425000000');
  });

  it('keeps currency', () => {
    expect(new Money('10', 'USD').multiply(2).currency).toBe('USD');
  });
});

describe('Money.divide', () => {
  it('divides by integer', () => {
    expect(new Money('100', 'USD').divide(4).toDecimalString()).toBe('25.0000000000');
  });

  it('divides by decimal', () => {
    expect(new Money('100', 'TWD').divide('31.65').toDecimalString()).toBe('3.1595576619');
  });

  it('throws DivisionByZeroError on zero divisor', () => {
    expect(() => new Money('100', 'USD').divide(0)).toThrow(DivisionByZeroError);
    expect(() => new Money('100', 'USD').divide('0')).toThrow(DivisionByZeroError);
  });
});

describe('Money.negate', () => {
  it('flips sign of positive value', () => {
    expect(new Money('100', 'USD').negate().toDecimalString()).toBe('-100.0000000000');
  });

  it('flips sign of negative value', () => {
    expect(new Money('-50', 'USD').negate().toDecimalString()).toBe('50.0000000000');
  });

  it('returns zero for zero', () => {
    expect(Money.zero('USD').negate().isZero()).toBe(true);
  });
});

describe('Money.isZero / isPositive / isNegative', () => {
  it('detects zero', () => {
    expect(Money.zero('USD').isZero()).toBe(true);
    expect(new Money('0.0000000001', 'USD').isZero()).toBe(false);
  });

  it('detects positive (strict, excludes zero)', () => {
    expect(new Money('1', 'USD').isPositive()).toBe(true);
    expect(Money.zero('USD').isPositive()).toBe(false);
    expect(new Money('-1', 'USD').isPositive()).toBe(false);
  });

  it('detects negative', () => {
    expect(new Money('-1', 'USD').isNegative()).toBe(true);
    expect(Money.zero('USD').isNegative()).toBe(false);
    expect(new Money('1', 'USD').isNegative()).toBe(false);
  });
});

describe('Money.equals', () => {
  it('returns true for same currency and value', () => {
    expect(new Money('10', 'USD').equals(new Money('10.0000000000', 'USD'))).toBe(true);
  });

  it('returns false for different currency', () => {
    expect(new Money('10', 'USD').equals(new Money('10', 'TWD'))).toBe(false);
  });

  it('returns false for different value', () => {
    expect(new Money('10', 'USD').equals(new Money('10.01', 'USD'))).toBe(false);
  });
});

describe('Money.compareTo', () => {
  it('returns -1 when this < other', () => {
    expect(new Money('1', 'USD').compareTo(new Money('2', 'USD'))).toBe(-1);
  });

  it('returns 0 when this == other', () => {
    expect(new Money('5', 'USD').compareTo(new Money('5', 'USD'))).toBe(0);
  });

  it('returns 1 when this > other', () => {
    expect(new Money('10', 'USD').compareTo(new Money('1', 'USD'))).toBe(1);
  });

  it('throws when currencies differ', () => {
    expect(() => new Money('1', 'USD').compareTo(new Money('1', 'TWD'))).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('Money.toDisplayString', () => {
  it('defaults to 2 decimal places', () => {
    expect(new Money('1234.5678', 'TWD').toDisplayString()).toBe('1234.57');
  });

  it('accepts custom decimal places', () => {
    expect(new Money('1234.5678', 'TWD').toDisplayString(0)).toBe('1235');
    expect(new Money('1234.5678', 'TWD').toDisplayString(4)).toBe('1234.5678');
  });

  it('uses ROUND_HALF_UP', () => {
    expect(new Money('1.005', 'USD').toDisplayString(2)).toBe('1.01');
    expect(new Money('1.004', 'USD').toDisplayString(2)).toBe('1.00');
  });
});

describe('Money.toNumber', () => {
  it('returns JS number (acknowledged precision loss for huge values)', () => {
    expect(new Money('1234.56', 'USD').toNumber()).toBeCloseTo(1234.56, 2);
  });
});

describe('Money.fromDecimalString', () => {
  it('rebuilds Money from Firestore storage string', () => {
    const m = Money.fromDecimalString('1234.5678901234', 'TWD');
    expect(m.currency).toBe('TWD');
    expect(m.toDecimalString()).toBe('1234.5678901234');
  });
});

describe('Money.zero', () => {
  it('creates zero of given currency', () => {
    expect(Money.zero('USD').isZero()).toBe(true);
    expect(Money.zero('USD').currency).toBe('USD');
  });
});

describe('CurrencyMismatchError', () => {
  it('carries the two currencies in fields', () => {
    try {
      new Money('1', 'USD').add(new Money('1', 'TWD'));
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CurrencyMismatchError);
      const err = e as CurrencyMismatchError;
      expect(err.left).toBe('USD');
      expect(err.right).toBe('TWD');
      expect(err.name).toBe('CurrencyMismatchError');
      expect(err.message).toContain('USD vs TWD');
    }
  });
});

describe('DivisionByZeroError', () => {
  it('has a descriptive name and message', () => {
    try {
      new Money('1', 'USD').divide(0);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(DivisionByZeroError);
      const err = e as DivisionByZeroError;
      expect(err.name).toBe('DivisionByZeroError');
      expect(err.message).toBe('Cannot divide Money by zero');
    }
  });
});
