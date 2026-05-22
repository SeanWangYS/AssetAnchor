import type { Currency } from '../enums/currencies.js';

export class CurrencyMismatchError extends Error {
  readonly left: Currency;
  readonly right: Currency;

  constructor(left: Currency, right: Currency) {
    super(`Cannot operate on Money values of different currencies: ${left} vs ${right}`);
    this.name = 'CurrencyMismatchError';
    this.left = left;
    this.right = right;
  }
}

export class DivisionByZeroError extends Error {
  constructor() {
    super('Cannot divide Money by zero');
    this.name = 'DivisionByZeroError';
  }
}
