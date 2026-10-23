import { bearerToken, checkIdToken, type IdTokenDeps } from './idTokenGate';

const ok = async () => ({ uid: 'user-1' });
const bad = async () => {
  throw new Error('invalid token');
};

function deps(over: Partial<IdTokenDeps> = {}): IdTokenDeps {
  return { mode: 'monitor', verify: ok, ...over };
}

describe('bearerToken', () => {
  it('extracts the token from a Bearer header, case-insensitively and trimmed', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('bearer   abc  ')).toBe('abc');
  });

  it('returns null for a missing, empty or non-Bearer header', () => {
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken('')).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
    expect(bearerToken('Basic abc')).toBeNull();
  });
});

describe('checkIdToken', () => {
  it('verified token is allowed in both modes and carries the uid', async () => {
    for (const mode of ['monitor', 'enforce'] as const) {
      await expect(checkIdToken('Bearer tok', deps({ mode }))).resolves.toEqual({
        outcome: 'verified',
        allow: true,
        uid: 'user-1',
      });
    }
  });

  it('missing token: monitor allows, enforce rejects', async () => {
    await expect(checkIdToken(undefined, deps())).resolves.toEqual({
      outcome: 'missing',
      allow: true,
    });
    await expect(checkIdToken('Basic x', deps({ mode: 'enforce' }))).resolves.toEqual({
      outcome: 'missing',
      allow: false,
    });
  });

  it('invalid token: monitor allows, enforce rejects', async () => {
    await expect(checkIdToken('Bearer tok', deps({ verify: bad }))).resolves.toEqual({
      outcome: 'invalid',
      allow: true,
      reason: 'unknown',
    });
    await expect(
      checkIdToken('Bearer tok', deps({ mode: 'enforce', verify: bad })),
    ).resolves.toEqual({ outcome: 'invalid', allow: false, reason: 'unknown' });
  });

  it('reports the verifier error code as the reason', async () => {
    const expired = async () => {
      throw Object.assign(new Error('expired'), { code: 'auth/id-token-expired' });
    };
    await expect(checkIdToken('Bearer tok', deps({ verify: expired }))).resolves.toMatchObject({
      outcome: 'invalid',
      reason: 'auth/id-token-expired',
    });
  });

  it('passes only the bare token to the verifier', async () => {
    const seen: string[] = [];
    await checkIdToken('Bearer  tok-9 ', deps({ verify: async (t) => (seen.push(t), ok()) }));
    expect(seen).toEqual(['tok-9']);
  });
});
