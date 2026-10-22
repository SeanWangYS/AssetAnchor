import { APP_CHECK_HEADER, appCheckHeaders } from './appCheckHeaders';

describe('appCheckHeaders', () => {
  it('attaches the token under the header the functions gate reads', () => {
    expect(appCheckHeaders('tok')).toEqual({ 'X-Firebase-AppCheck': 'tok' });
    expect(APP_CHECK_HEADER).toBe('X-Firebase-AppCheck');
  });

  it('sends no header without a token', () => {
    expect(appCheckHeaders(null)).toEqual({});
    expect(appCheckHeaders('')).toEqual({});
  });
});
