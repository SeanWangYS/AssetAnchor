import { authHeaders } from './authHeaders';

describe('authHeaders', () => {
  it('sends the ID token as a Bearer Authorization header', () => {
    expect(authHeaders('tok')).toEqual({ Authorization: 'Bearer tok' });
  });

  it('sends no header without a token (signed out or token failure)', () => {
    expect(authHeaders(null)).toEqual({});
    expect(authHeaders('')).toEqual({});
  });
});
