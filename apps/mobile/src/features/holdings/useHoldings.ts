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
 */
export function useHoldings(): Position[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => deriveHoldings(transactions), [transactions]);
}

/** 已實現損益事件（時序，§4）；供持倉「本月已實現」等彙總。同樣零新增 I/O。 */
export function useRealizedEvents(): RealizedEvent[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => deriveRealizedEvents(transactions), [transactions]);
}
