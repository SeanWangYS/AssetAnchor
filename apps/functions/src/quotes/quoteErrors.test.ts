import { describe, expect, it } from '@jest/globals';
import { SymbolNotFoundError, classifyQuoteError, quoteErrorPayload } from './quoteErrors';

describe('classifyQuoteError', () => {
  it('SymbolNotFoundError → symbol_not_found', () => {
    expect(classifyQuoteError(new SymbolNotFoundError('US', '0050'))).toBe('symbol_not_found');
  });

  it('一般 Error（網路/429/5xx/sanity）→ transient', () => {
    expect(classifyQuoteError(new Error('Yahoo fetch 失敗：HTTP 429（0050.TW）'))).toBe(
      'transient',
    );
    expect(classifyQuoteError(new Error('報價資料未通過驗證'))).toBe('transient');
  });

  it('非 Error 值 → transient', () => {
    expect(classifyQuoteError('boom')).toBe('transient');
    expect(classifyQuoteError(undefined)).toBe('transient');
  });
});

describe('quoteErrorPayload', () => {
  it('symbol_not_found 帶查無代號訊息', () => {
    const p = quoteErrorPayload(new SymbolNotFoundError('US', '0050'));
    expect(p.code).toBe('symbol_not_found');
    expect(p.message).toContain('查無報價代號');
  });

  it('transient 帶暫時無法取得訊息', () => {
    const p = quoteErrorPayload(new Error('boom'));
    expect(p.code).toBe('transient');
    expect(p.message).toContain('報價暫時無法取得');
  });
});
