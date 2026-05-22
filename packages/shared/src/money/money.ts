import Decimal from 'decimal.js';
import type { Currency } from '../enums/currencies.js';
import { CurrencyMismatchError, DivisionByZeroError, InvalidMoneyValueError } from './errors.js';

const STORAGE_DECIMALS = 10;
const DEFAULT_DISPLAY_DECIMALS = 2;

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/**
 * Money — immutable monetary value with a currency tag.
 *
 * Always use Money for amounts, costs, fees, rates, and cash balances.
 * Never use plain `number` for monetary math — float drift will produce
 * reconciliation errors that the bank statement does not forgive.
 *
 * Storage form: `toDecimalString()` always returns 10 decimal places (Firestore canonical).
 * Display form: `toDisplayString(n)` returns `n` decimal places (default 2), ROUND_HALF_UP.
 * Construct from Firestore: `Money.fromDecimalString(s, currency)`.
 *
 * Operations on different currencies throw `CurrencyMismatchError`.
 * Construction or operations with NaN / ±Infinity throw `InvalidMoneyValueError`.
 * Division by zero throws `DivisionByZeroError`.
 */
export class Money {
  readonly currency: Currency;
  private readonly value: Decimal;

  constructor(value: string | number, currency: Currency) {
    const d = new Decimal(value);
    Money.assertFinite(d, value);
    this.value = d;
    this.currency = currency;
  }

  toDecimalString(): string {
    return this.value.toFixed(STORAGE_DECIMALS);
  }

  toDisplayString(decimals: number = DEFAULT_DISPLAY_DECIMALS): string {
    return this.value.toFixed(decimals);
  }

  /**
   * Escape hatch — converts to JS number. Loses precision above ~15
   * significant digits and re-introduces float drift. Use only for
   * UI / charting layers that genuinely cannot accept strings.
   */
  toNumber(): number {
    return this.value.toNumber();
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.plus(other.value).toString(), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.minus(other.value).toString(), this.currency);
  }

  multiply(factor: string | number): Money {
    const f = new Decimal(factor);
    Money.assertFinite(f, factor);
    return new Money(this.value.times(f).toString(), this.currency);
  }

  divide(divisor: string | number): Money {
    const d = new Decimal(divisor);
    Money.assertFinite(d, divisor);
    if (d.isZero()) throw new DivisionByZeroError();
    return new Money(this.value.div(d).toString(), this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated().toString(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  compareTo(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    return this.value.cmp(other.value) as -1 | 0 | 1;
  }

  static zero(currency: Currency): Money {
    return new Money('0', currency);
  }

  static fromDecimalString(s: string, currency: Currency): Money {
    return new Money(s, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }

  private static assertFinite(d: Decimal, raw: string | number): void {
    if (!d.isFinite()) {
      throw new InvalidMoneyValueError(raw);
    }
  }
}
