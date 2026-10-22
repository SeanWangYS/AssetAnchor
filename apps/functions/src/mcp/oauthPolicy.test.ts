import {
  ACCESS_TOKEN_TTL,
  REFRESH_ABSOLUTE_TTL,
  refreshTokenTtl,
  createRateLimiter,
} from './oauthPolicy';

describe('token lifetimes', () => {
  it('keeps access tokens for one hour and refresh for at most 30 days', () => {
    expect(ACCESS_TOKEN_TTL).toBe(3600);
    expect(REFRESH_ABSOLUTE_TTL).toBe(30 * 24 * 3600);
  });

  it('gives a fresh refresh token the full 30 days', () => {
    expect(refreshTokenTtl(1000, 1000)).toBe(REFRESH_ABSOLUTE_TTL);
  });

  it('shortens rotated refresh tokens to the time left since first authorization', () => {
    const tenDays = 10 * 24 * 3600;
    expect(refreshTokenTtl(1000, 1000 + tenDays)).toBe(REFRESH_ABSOLUTE_TTL - tenDays);
  });

  it('expires immediately once 30 days have passed', () => {
    expect(refreshTokenTtl(1000, 1000 + REFRESH_ABSOLUTE_TTL + 5)).toBe(1);
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const allow = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(allow('1.2.3.4', 0)).toBe(true);
    expect(allow('1.2.3.4', 1000)).toBe(true);
    expect(allow('1.2.3.4', 2000)).toBe(false);
    expect(allow('5.6.7.8', 2000)).toBe(true);
  });

  it('opens again after the window', () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(allow('k', 0)).toBe(true);
    expect(allow('k', 59_999)).toBe(false);
    expect(allow('k', 60_000)).toBe(true);
  });

  it('forgets idle keys so memory stays bounded', () => {
    const allow = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    allow('a', 0);
    allow('b', 0);
    allow('c', 0);
    expect(allow('a', 10)).toBe(true);
  });
});
