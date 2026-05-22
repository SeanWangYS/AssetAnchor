import Decimal from 'decimal.js';
import type { Currency } from '../enums/currencies.js';
import { CurrencyMismatchError, DivisionByZeroError } from './errors.js';

const STORAGE_DECIMALS = 10;
const DEFAULT_DISPLAY_DECIMALS = 2;

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  readonly currency: Currency;
  private readonly value: Decimal;

  constructor(value: string | number, currency: Currency) {
    this.value = new Decimal(value);
    this.currency = currency;
  }

  toDecimalString(): string {
    return this.value.toFixed(STORAGE_DECIMALS);
  }

  toDisplayString(decimals: number = DEFAULT_DISPLAY_DECIMALS): string {
    return this.value.toFixed(decimals);
  }

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
    return new Money(this.value.times(new Decimal(factor)).toString(), this.currency);
  }

  divide(divisor: string | number): Money {
    const d = new Decimal(divisor);
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
}
