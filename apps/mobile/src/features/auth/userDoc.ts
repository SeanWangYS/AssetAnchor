import { doc, getDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import type { UserDocument } from '@assetanchor/shared';
import { auth, db } from '../../services/firebase';

/** 註冊後建立 users/{uid}（已存在則略過）。created_at/updated_at 用 serverTimestamp。 */
export async function createUserDocIfMissing(): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;
  const ref = doc(db, 'users', current.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    uid: current.uid,
    email: current.email ?? '',
    display_name: current.displayName ?? '',
    preferred_display_currency: 'TWD',
    preferred_locale: 'zh-TW',
    settings: { theme: 'auto', default_account_id: null },
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

/** 讀回目前使用者的 users/{uid}（boundary narrow 成 shared 型別）。 */
export async function getUserDoc(): Promise<UserDocument | null> {
  const current = auth.currentUser;
  if (!current) return null;
  const snap = await getDoc(doc(db, 'users', current.uid));
  return snap.exists() ? (snap.data() as UserDocument) : null;
}
