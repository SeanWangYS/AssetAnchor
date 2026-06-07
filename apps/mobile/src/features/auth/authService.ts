import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../../services/firebase';
import { authErrorMessage } from './authErrors';
import { createUserDocIfMissing } from './userDoc';

export interface AuthResult {
  ok: boolean;
  errorMessage?: string;
}

function toResult(e: unknown): AuthResult {
  const code = (e as { code?: string }).code ?? 'auth/unknown';
  return { ok: false, errorMessage: authErrorMessage(code) };
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    try {
      await createUserDocIfMissing();
    } catch {
      // 非致命：rail doc 失敗不阻斷註冊，可日後補建
    }
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    const idToken = result.data?.idToken;
    if (!idToken) {
      return { ok: false, errorMessage: '未取得 Google idToken。' };
    }
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    try {
      await createUserDocIfMissing();
    } catch {
      // 非致命
    }
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
