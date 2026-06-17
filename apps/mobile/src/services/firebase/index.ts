import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';

export const auth = getAuth(getApp());
export const db = getFirestore(getApp());

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
const PROJECT_ID = 'assetanchor-832df';
const FUNCTIONS_REGION = 'asia-east1';

/**
 * Cloud Functions HTTP base URL（ADR-0006：`fetchQuote` 採 onRequest，mobile 以 fetch 觸發，
 * 免 RNFirebase functions 原生模組）。dev 指向 Functions 模擬器（5001），正式指向雲端。
 */
export const functionsBaseUrl = USE_EMULATOR
  ? `http://localhost:5001/${PROJECT_ID}/${FUNCTIONS_REGION}`
  : `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net`;

let wired = false;

/** dev 時把 app 指向本地 Firebase Emulator Suite。App 啟動時呼叫一次。 */
export function wireEmulatorsOnce(): void {
  if (!USE_EMULATOR || wired) return;
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  wired = true;
}
