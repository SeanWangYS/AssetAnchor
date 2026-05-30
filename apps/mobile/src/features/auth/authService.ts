import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';
import { auth } from '../../services/firebase';
import { authErrorMessage } from './authErrors';

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
