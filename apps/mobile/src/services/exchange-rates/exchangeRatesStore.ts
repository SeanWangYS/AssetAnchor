import { create } from 'zustand';
import { onSnapshot, query, orderBy, limit } from '@react-native-firebase/firestore';
import type { ExchangeRateDocument, RateMap } from '@assetanchor/shared';
import { exchangeRatesCol } from '../../core/firestore';

interface ExchangeRatesState {
  /** 最新一筆的 rates；null = 匯率未就緒（函式還沒跑過 / 讀取失敗）。 */
  rates: RateMap | null;
  /** 最新牌告日（顯示「依 X 匯率換算」用）。 */
  date: string | null;
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  /** 監聽最新一筆 exchange_rates（全域、登入後可讀）。 */
  subscribe: () => void;
  /** 停止監聽並清空（登出時）。 */
  stop: () => void;
}

/**
 * 顯示時 FX 的匯率來源（ADR-0005 / design D4）：mobile 不呼叫 Cloud Function，
 * 只用一般 Firestore 讀「最新一筆」exchange_rates。無資料時優雅降級（rates=null）。
 */
export const useExchangeRatesStore = create<ExchangeRatesState>((set, get) => ({
  rates: null,
  date: null,
  loading: false,
  error: null,
  unsubscribe: null,

  subscribe: () => {
    get().stop();
    set({ loading: true, error: null });
    const unsub = onSnapshot(
      query(exchangeRatesCol(), orderBy('date', 'desc'), limit(1)),
      (snap) => {
        const docSnap = snap.docs[0];
        if (!docSnap) {
          set({ rates: null, date: null, loading: false });
          return;
        }
        const data = docSnap.data() as ExchangeRateDocument;
        set({ rates: data.rates, date: data.date, loading: false });
      },
      (err: Error) => set({ error: err.message, loading: false }),
    );
    set({ unsubscribe: unsub });
  },

  stop: () => {
    const unsub = get().unsubscribe;
    if (unsub) unsub();
    set({ unsubscribe: null, rates: null, date: null, loading: false, error: null });
  },
}));
