/** Firebase Auth error code → 友善繁中訊息（zh-TW hard-code）。 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email 格式不正確。';
    case 'auth/user-disabled':
      return '此帳號已被停用。';
    case 'auth/user-not-found':
      return '查無此帳號。';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email 或密碼錯誤。';
    case 'auth/email-already-in-use':
      return '此 Email 已被註冊。';
    case 'auth/weak-password':
      return '密碼強度不足（至少 6 碼）。';
    case 'auth/network-request-failed':
      return '網路連線失敗，請稍後再試。';
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試。';
    default:
      return `登入發生問題（${code}）。`;
  }
}
