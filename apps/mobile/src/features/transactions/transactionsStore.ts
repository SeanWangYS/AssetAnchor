import { create } from 'zustand';
import { onSnapshot, orderBy, query } from '@react-native-firebase/firestore';
import type { TransactionDocument } from '@assetanchor/shared';
import { transactionsCol } from '../../core/firestore';

interface TransactionsState {
  transactions: TransactionDocument[];
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  /** 開始監聽某 uid 的 transactions（依 transaction_date 由新到舊，即時同步）。 */
  subscribe: (uid: string) => void;
  /** 停止監聽並清空（登出 / unmount 時呼叫，避免 permission-denied 噪音）。 */
  stop: () => void;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,
  unsubscribe: null,

  subscribe: (uid) => {
    get().stop();
    set({ loading: true, error: null });
    const unsub = onSnapshot(
      query(transactionsCol(uid), orderBy('transaction_date', 'desc')),
      (snap) => {
        const transactions = snap.docs.map((d) => d.data() as TransactionDocument);
        set({ transactions, loading: false });
      },
      (err: Error) => set({ error: err.message, loading: false }),
    );
    set({ unsubscribe: unsub });
  },

  stop: () => {
    const unsub = get().unsubscribe;
    if (unsub) unsub();
    set({ unsubscribe: null, transactions: [], loading: false, error: null });
  },
}));
