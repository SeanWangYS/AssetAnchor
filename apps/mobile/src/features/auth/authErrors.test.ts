import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('maps known auth codes to zh-TW messages', () => {
    expect(authErrorMessage('auth/wrong-password')).toBe('Email 或密碼錯誤。');
    expect(authErrorMessage('auth/email-already-in-use')).toBe('此 Email 已被註冊。');
    expect(authErrorMessage('auth/weak-password')).toBe('密碼強度不足（至少 6 碼）。');
  });

  it('falls back with the raw code for unknown errors', () => {
    expect(authErrorMessage('auth/brand-new-code')).toContain('auth/brand-new-code');
  });
});
