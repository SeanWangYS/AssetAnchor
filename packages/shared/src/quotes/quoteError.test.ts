import { describe, expect, it } from '@jest/globals';
import { QUOTE_ERROR_CODES, isQuoteErrorCode } from './quoteError.js';

describe('QuoteErrorCode', () => {
  it('涵蓋 symbol_not_found 與 transient 兩類', () => {
    expect(QUOTE_ERROR_CODES).toEqual(['symbol_not_found', 'transient']);
  });

  it('isQuoteErrorCode 接受合法錯誤碼', () => {
    expect(isQuoteErrorCode('symbol_not_found')).toBe(true);
    expect(isQuoteErrorCode('transient')).toBe(true);
  });

  it('isQuoteErrorCode 拒絕非法值', () => {
    expect(isQuoteErrorCode('not_a_code')).toBe(false);
    expect(isQuoteErrorCode('')).toBe(false);
    expect(isQuoteErrorCode(undefined)).toBe(false);
    expect(isQuoteErrorCode(null)).toBe(false);
    expect(isQuoteErrorCode(404)).toBe(false);
    expect(isQuoteErrorCode({ code: 'transient' })).toBe(false);
  });
});
