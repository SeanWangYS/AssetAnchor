import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from './displayName.js';

describe('validateDisplayName', () => {
  it('accepts a normal name and returns the trimmed value', () => {
    const result = validateDisplayName('  Sean  ');
    expect(result).toEqual({ ok: true, value: 'Sean' });
  });

  it('accepts a name already trimmed', () => {
    expect(validateDisplayName('Sean')).toEqual({ ok: true, value: 'Sean' });
  });

  it('rejects an empty string as empty', () => {
    expect(validateDisplayName('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a whitespace-only string as empty', () => {
    expect(validateDisplayName('   \t  ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('accepts a name exactly at the max length', () => {
    const atMax = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(validateDisplayName(atMax)).toEqual({ ok: true, value: atMax });
  });

  it('rejects a name longer than max (after trim) as too_long', () => {
    const tooLong = `  ${'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1)}  `;
    expect(validateDisplayName(tooLong)).toEqual({ ok: false, reason: 'too_long' });
  });

  it('exposes a positive max length', () => {
    expect(DISPLAY_NAME_MAX_LENGTH).toBeGreaterThan(0);
  });
});
