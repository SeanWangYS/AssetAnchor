import { create } from 'zustand';
import { doc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { isDisplayCurrency, type DisplayCurrency, type UserDocument } from '@assetanchor/shared';
import { auth, db } from '../firebase';

/**
 * 跨切面顯示偏好 store（app-wide 資料層，對照 services/exchange-rates）。住 services/ 而非
 * feature——holdings / analysis 都消費它，放 feature 會違反「features 之間不互相 import」(#4)；
 * 且本 store 自帶 Firestore 持久化（I/O），屬資料層、非 core 展示層。
 *
 * 來源：登入時由 App.tsx 讀 users/{uid} 後 `hydrate(doc)` 灌入；持倉頁切換時 `changeDisplayCurrency`
 * 樂觀更新 + 持久化 users/{uid}.preferred_display_currency（失敗自動還原）；登出 `reset`。
 * 一次性 hydrate（非即時 onSnapshot）對單機 MVP 足夠。
 */
const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'TWD';

interface PreferencesState {
  /** 跨幣別合計 / 各頁顯示所用的顯示幣別。 */
  preferredDisplayCurrency: DisplayCurrency;
  /** 登入後由 user doc 灌入（缺值 / 非支援值退回 TWD）。 */
  hydrate: (doc: UserDocument | null) => void;
  /**
   * 切換顯示幣別：樂觀更新 store（令消費畫面即時切）→ 持久化 users/{uid}。
   * 持久化失敗則還原前值並回傳 false（呼叫端據此提示）；成功 / 未登入 no-op 回傳 true。
   */
  changeDisplayCurrency: (currency: DisplayCurrency) => Promise<boolean>;
  /** 登出時還原預設。 */
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  preferredDisplayCurrency: DEFAULT_DISPLAY_CURRENCY,
  hydrate: (userDoc) =>
    set({
      preferredDisplayCurrency: isDisplayCurrency(userDoc?.preferred_display_currency)
        ? userDoc.preferred_display_currency
        : DEFAULT_DISPLAY_CURRENCY,
    }),
  changeDisplayCurrency: async (currency) => {
    const prev = get().preferredDisplayCurrency;
    if (currency === prev) return true;
    set({ preferredDisplayCurrency: currency }); // 樂觀更新
    const current = auth.currentUser;
    if (!current) return true; // 未登入：僅 in-memory（不持久化）
    try {
      await updateDoc(doc(db, 'users', current.uid), {
        preferred_display_currency: currency,
        updated_at: serverTimestamp(),
      });
      return true;
    } catch {
      set({ preferredDisplayCurrency: prev }); // 失敗還原
      return false;
    }
  },
  reset: () => set({ preferredDisplayCurrency: DEFAULT_DISPLAY_CURRENCY }),
}));
