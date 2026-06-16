import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { updateProfile } from '@react-native-firebase/auth';
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

/**
 * 寫回顯示名稱：先更新 users/{uid}.display_name（app source of truth）+ updated_at，
 * 再同步 Auth profile displayName（部分既有畫面讀 Auth displayName，保持一致）。
 * 任一步驟拋錯即整體失敗（無跨服務交易，MVP 以錯誤回饋讓使用者重試）。未登入則 no-op。
 * 呼叫端負責先以 shared 的 validateDisplayName gate（本函式僅負責寫入）。
 */
export async function updateUserProfile(fields: { display_name: string }): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;
  await updateDoc(doc(db, 'users', current.uid), {
    display_name: fields.display_name,
    updated_at: serverTimestamp(),
  });
  await updateProfile(current, { displayName: fields.display_name });
}
