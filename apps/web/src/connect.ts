import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  type User,
} from 'firebase/auth';

/**
 * MCP connector login and consent (add-mcp-auth-readonly D4). The page learns the
 * authorization server from same-origin protected-resource metadata, never from the URL,
 * so a crafted link cannot send the user's ID token elsewhere.
 */

const EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
const EMULATOR_PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-assetanchor';
const AUTH_EMULATOR_URL = import.meta.env.VITE_AUTH_EMULATOR_URL ?? 'http://127.0.0.1:9099';

type View = 'loading' | 'login' | 'consent' | 'error';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

function show(view: View) {
  for (const v of ['loading', 'login', 'consent', 'error'] as const) {
    el(`view-${v}`).hidden = v !== view;
  }
}

function fail(message: string) {
  el('error-message').textContent = message;
  show('error');
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email 或密碼錯誤',
  'auth/invalid-email': 'Email 格式不正確',
  'auth/user-disabled': '此帳號已停用',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試',
  'auth/network-request-failed': '網路連線失敗，請稍後再試',
  'auth/popup-closed-by-user': '已取消 Google 登入',
  'auth/popup-blocked': '瀏覽器擋下了登入視窗，請允許彈出視窗後再試',
};

function authMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  return AUTH_ERRORS[code] ?? '登入失敗，請稍後再試';
}

async function firebaseConfig(): Promise<FirebaseOptions> {
  if (EMULATOR) return { apiKey: 'demo-key', projectId: EMULATOR_PROJECT, authDomain: 'localhost' };
  const res = await fetch('/__/firebase/init.json');
  if (!res.ok) throw new Error('firebase init.json unavailable');
  return (await res.json()) as FirebaseOptions;
}

async function authorizationServer(): Promise<string> {
  const res = await fetch('/.well-known/oauth-protected-resource/mcp');
  if (!res.ok) throw new Error('protected resource metadata unavailable');
  const meta = (await res.json()) as { authorization_servers?: string[] };
  const issuer = meta.authorization_servers?.[0];
  if (!issuer) throw new Error('no authorization server');
  return issuer.replace(/\/+$/, '');
}

async function main() {
  const params = new URLSearchParams(location.search);
  const interaction = params.get('interaction') ?? '';
  if (!/^[A-Za-z0-9_-]+$/.test(interaction)) {
    fail('連線網址不完整，請回到 Claude 重新連線 AssetAnchor。');
    return;
  }
  for (const node of document.querySelectorAll('.client-name')) {
    node.textContent = params.get('client') || 'Claude';
  }

  let issuer: string;
  let config: FirebaseOptions;
  try {
    [issuer, config] = await Promise.all([authorizationServer(), firebaseConfig()]);
  } catch {
    fail('暫時無法連線 AssetAnchor，請稍後再試。');
    return;
  }

  const auth = getAuth(initializeApp(config));
  if (EMULATOR) connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  // Never keep a session in this browser: each connector authorization signs in afresh.
  await setPersistence(auth, inMemoryPersistence);
  const interactionUrl = `${issuer}/interaction/${encodeURIComponent(interaction)}`;

  async function completeLogin(user: User) {
    const idToken = await user.getIdToken();
    const res = await fetch(`${interactionUrl}/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      fail(body.error ?? '授權連線已逾時，請回到 Claude 重新連線 AssetAnchor。');
      return;
    }
    el('account-email').textContent = user.email ?? user.uid;
    show('consent');
  }

  const loginError = el('login-error');
  const busy = (on: boolean) => {
    for (const b of el('view-login').querySelectorAll('button')) b.disabled = on;
  };

  el<HTMLFormElement>('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const email = el<HTMLInputElement>('email').value.trim();
    const password = el<HTMLInputElement>('password').value;
    if (!email || !password) {
      loginError.textContent = '請輸入 Email 與密碼';
      loginError.hidden = false;
      return;
    }
    busy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await completeLogin(cred.user);
    } catch (err) {
      loginError.textContent = authMessage(err);
      loginError.hidden = false;
    } finally {
      busy(false);
    }
  });

  el('google').addEventListener('click', async () => {
    loginError.hidden = true;
    busy(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await completeLogin(cred.user);
    } catch (err) {
      loginError.textContent = authMessage(err);
      loginError.hidden = false;
    } finally {
      busy(false);
    }
  });

  el('allow').addEventListener('click', () => {
    location.assign(`${interactionUrl}/confirm`);
  });
  el('deny').addEventListener('click', () => {
    location.assign(`${interactionUrl}/abort`);
  });

  show('login');
}

void main();
