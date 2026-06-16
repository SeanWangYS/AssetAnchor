import { create } from 'zustand';
import { isDisplayCurrency, type DisplayCurrency, type UserDocument } from '@assetanchor/shared';

/**
 * 跨切面顯示偏好 store（app-wide）。住 core/ 而非某 feature——holdings / analysis /
 * settings 都消費它，放 feature 會違反「features 之間不互相 import」依賴方向。
 *
 * 來源：登入時由 App.tsx 讀 users/{uid} 後 `hydrate(doc)` 灌入；DisplayPrefs 改值時
 * `setPreferredDisplayCurrency` 樂觀更新（同時持久化回 Firestore）；登出 `reset`。
 * 一次性 hydrate（非即時 onSnapshot）對單機 MVP 足夠；偏好變更由寫入端同步更新本 store。
 */
const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'TWD';

interface PreferencesState {
  /** 跨幣別合計 / 各頁切換預設所用的顯示幣別。 */
  preferredDisplayCurrency: DisplayCurrency;
  /** 登入後由 user doc 灌入（缺值 / 非支援值退回 TWD）。 */
  hydrate: (doc: UserDocument | null) => void;
  /** 設定頁切換時樂觀更新（持久化由呼叫端負責）。 */
  setPreferredDisplayCurrency: (currency: DisplayCurrency) => void;
  /** 登出時還原預設。 */
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferredDisplayCurrency: DEFAULT_DISPLAY_CURRENCY,
  hydrate: (doc) =>
    set({
      preferredDisplayCurrency: isDisplayCurrency(doc?.preferred_display_currency)
        ? doc.preferred_display_currency
        : DEFAULT_DISPLAY_CURRENCY,
    }),
  setPreferredDisplayCurrency: (currency) => set({ preferredDisplayCurrency: currency }),
  reset: () => set({ preferredDisplayCurrency: DEFAULT_DISPLAY_CURRENCY }),
}));
