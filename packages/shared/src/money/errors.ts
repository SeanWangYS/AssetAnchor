import type { Currency } from '../enums/currencies.js';

/**
 * Base class for all Money-related errors. Consumers can catch this to handle
 * any monetary computation failure without listing each subtype.
 */
export abstract class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CurrencyMismatchError extends MoneyError {
  readonly left: Currency;
  readonly right: Currency;

  constructor(left: Currency, right: Currency) {
    super(`Cannot operate on Money values of different currencies: ${left} vs ${right}`);
    this.left = left;
    this.right = right;
  }
}

export class DivisionByZeroError extends MoneyError {
  constructor() {
    super('Cannot divide Money by zero');
  }
}

/**
 * Thrown when a Money operation receives a non-finite (NaN or ±Infinity) value
 * either in construction or as a multiply/divide factor.
 */
export class InvalidMoneyValueError extends MoneyError {
  readonly raw: string | number;

  constructor(raw: string | number) {
    super(`Money value must be finite; received: ${String(raw)}`);
    this.raw = raw;
  }
}
