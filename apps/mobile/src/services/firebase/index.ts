import { getApp } from '@react-native-firebase/app';
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth';
import { getFirestore, connectFirestoreEmulator } from '@react-native-firebase/firestore';

export const auth = getAuth(getApp());
export const db = getFirestore(getApp());

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
let wired = false;

/** dev 時把 app 指向本地 Firebase Emulator Suite。App 啟動時呼叫一次。 */
export function wireEmulatorsOnce(): void {
  if (!USE_EMULATOR || wired) return;
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  wired = true;
}
