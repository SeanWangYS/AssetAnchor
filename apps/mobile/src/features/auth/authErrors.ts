/** Firebase Auth error code → 友善繁中訊息（zh-TW hard-code）。 */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return '電子郵件格式不正確。';
    case 'auth/user-disabled':
      return '此帳號已被停用。';
    // spec 錯誤碼對照表把 user-not-found 併入帳密錯誤（auth-flow-spec L64）——
    // 亦避免洩漏帳號存在性（visual-audit P3-18）。
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '電子郵件或密碼錯誤，請再試一次。';
    case 'auth/email-already-in-use':
      return '此電子郵件已被註冊，請改用其他信箱或直接登入。';
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
