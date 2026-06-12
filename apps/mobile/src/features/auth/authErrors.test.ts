import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('maps every known auth code to its zh-TW message', () => {
    expect(authErrorMessage('auth/invalid-email')).toBe('Email 格式不正確。');
    expect(authErrorMessage('auth/user-disabled')).toBe('此帳號已被停用。');
    expect(authErrorMessage('auth/user-not-found')).toBe('查無此帳號。');
    expect(authErrorMessage('auth/wrong-password')).toBe('Email 或密碼錯誤。');
    expect(authErrorMessage('auth/invalid-credential')).toBe('Email 或密碼錯誤。');
    expect(authErrorMessage('auth/email-already-in-use')).toBe('此 Email 已被註冊。');
    expect(authErrorMessage('auth/weak-password')).toBe('密碼強度不足（至少 6 碼）。');
    expect(authErrorMessage('auth/network-request-failed')).toBe('網路連線失敗，請稍後再試。');
    expect(authErrorMessage('auth/too-many-requests')).toBe('嘗試次數過多，請稍後再試。');
  });

  it('falls back with the raw code for unknown errors', () => {
    expect(authErrorMessage('auth/brand-new-code')).toContain('auth/brand-new-code');
  });
});
