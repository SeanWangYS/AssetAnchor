import { useMemo } from 'react';
import { deriveHoldings, type Position } from '@assetanchor/shared';
import { useTransactionsStore } from '../transactions/transactionsStore';

/**
 * 由既有 transactionsStore（onSnapshot）的資料以 useMemo 動態推導持倉。
 * 不新增 Firestore 監聽（design D3）；跨 feature 讀 store 為 codebase 既有慣例。
 */
export function useHoldings(): Position[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => deriveHoldings(transactions), [transactions]);
}
