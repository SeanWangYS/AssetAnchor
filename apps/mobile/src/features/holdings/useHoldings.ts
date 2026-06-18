import { useMemo } from 'react';
import {
  deriveHoldings,
  deriveRealizedEvents,
  type Position,
  type RealizedEvent,
} from '@assetanchor/shared';
import { useTransactionsStore } from '../transactions/transactionsStore';

/**
 * 由既有 transactionsStore（onSnapshot）的資料以 useMemo 動態推導持倉。
 * 不新增 Firestore 監聽（design D3）；跨 feature 讀 store 為 codebase 既有慣例。
 *
 * deriveHoldings 對資料不一致（如超賣）採 fail-loud throw（ADR-0007 §5b，刻意保留）。
 * 此 hook 在 render 期間呼叫，若 throw 冒泡會白屏整個畫面，故在此 mobile 消費邊界
 * fail-soft：捕捉、warn、回空陣列讓畫面降級。回傳型別維持 Position[]（向後相容，
 * 不破壞既有 destructuring）；不更動 shared 的 throw 行為。
 */
export function useHoldings(): Position[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => {
    try {
      return deriveHoldings(transactions);
    } catch (err) {
      console.warn(
        '[holdings] deriveHoldings 推導失敗，降級為空持倉：',
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }, [transactions]);
}

/** 已實現損益事件（時序，§4）；供持倉「本月已實現」等彙總。同樣零新增 I/O。 */
export function useRealizedEvents(): RealizedEvent[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => {
    try {
      return deriveRealizedEvents(transactions);
    } catch (err) {
      console.warn(
        '[holdings] deriveRealizedEvents 推導失敗，降級為空事件：',
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }, [transactions]);
}
