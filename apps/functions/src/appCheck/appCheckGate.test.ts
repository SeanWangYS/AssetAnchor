import { checkAppCheck, type AppCheckDeps } from './appCheckGate';

const ok = async () => ({ appId: 'ios-app' });
const bad = async () => {
  throw new Error('invalid token');
};

function deps(over: Partial<AppCheckDeps> = {}): AppCheckDeps {
  return { mode: 'monitor', isEmulator: false, verify: ok, ...over };
}

describe('checkAppCheck', () => {
  it('verified token is allowed in both modes', async () => {
    for (const mode of ['monitor', 'enforce'] as const) {
      await expect(checkAppCheck('tok', deps({ mode }))).resolves.toEqual({
        outcome: 'verified',
        allow: true,
      });
    }
  });

  it('missing header: monitor allows, enforce rejects', async () => {
    await expect(checkAppCheck(undefined, deps())).resolves.toEqual({
      outcome: 'missing',
      allow: true,
    });
    await expect(checkAppCheck('', deps({ mode: 'enforce' }))).resolves.toEqual({
      outcome: 'missing',
      allow: false,
    });
  });

  it('invalid token: monitor allows, enforce rejects', async () => {
    await expect(checkAppCheck('tok', deps({ verify: bad }))).resolves.toEqual({
      outcome: 'invalid',
      allow: true,
    });
    await expect(checkAppCheck('tok', deps({ mode: 'enforce', verify: bad }))).resolves.toEqual({
      outcome: 'invalid',
      allow: false,
    });
  });

  it('emulator skips verification entirely, even in enforce mode', async () => {
    const verify = jest.fn(ok);
    await expect(
      checkAppCheck(undefined, deps({ mode: 'enforce', isEmulator: true, verify })),
    ).resolves.toEqual({ outcome: 'skipped', allow: true });
    expect(verify).not.toHaveBeenCalled();
  });
});
