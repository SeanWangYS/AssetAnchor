import { create } from 'zustand';
import { onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import type { AccountDocument } from '@assetanchor/shared';
import { accountsCol } from '../../core/firestore';

interface AccountsState {
  accounts: AccountDocument[];
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  /** 開始監聽某 uid 的 accounts（依 display_order，即時同步）。 */
  subscribe: (uid: string) => void;
  /** 停止監聽並清空（登出 / unmount 時呼叫，避免 permission-denied 噪音 — D4）。 */
  stop: () => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  loading: false,
  error: null,
  unsubscribe: null,

  subscribe: (uid) => {
    get().stop();
    set({ loading: true, error: null });
    const unsub = onSnapshot(
      query(accountsCol(uid), orderBy('display_order')),
      (snap) => {
        const accounts = snap.docs.map((d) => d.data() as AccountDocument);
        set({ accounts, loading: false });
      },
      (err: Error) => set({ error: err.message, loading: false }),
    );
    set({ unsubscribe: unsub });
  },

  stop: () => {
    const unsub = get().unsubscribe;
    if (unsub) unsub();
    set({ unsubscribe: null, accounts: [], loading: false, error: null });
  },
}));
