import { useMemo } from 'react';
import {
  deriveHoldingsSafe,
  deriveRealizedEvents,
  type Position,
  type RealizedEvent,
} from '@assetanchor/shared';
import { reportHandledError } from '../../services/monitoring';
import { useTransactionsStore } from '../transactions/transactionsStore';

/**
 * 由既有 transactionsStore（onSnapshot）的資料以 useMemo 動態推導持倉。
 * 不新增 Firestore 監聽（design D3）；跨 feature 讀 store 為 codebase 既有慣例。
 *
 * 全域總覽改用 `deriveHoldingsSafe`（enable-crypto-quotes D8）：逐-(market,symbol) 容錯，
 * 單一 symbol 爛資料（超賣 / orphan SELL）只跳過該 symbol、不清空整個投資組合。
 * skipped 非空時上報留跡（silent-severe）。外層 try/catch 為最後防線（理論上不再觸發）。
 * 回傳型別維持 Position[]（向後相容，不破壞既有 destructuring）。
 */
export function useHoldings(): Position[] {
  const transactions = useTransactionsStore((s) => s.transactions);
  return useMemo(() => {
    try {
      const { positions, skipped } = deriveHoldingsSafe(transactions);
      if (skipped.length > 0) {
        reportHandledError('holdings:symbols_skipped', {
          skipped: skipped.map((x) => `${x.market}_${x.symbol}`).join(','),
        });
      }
      return positions;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[holdings] deriveHoldings 推導失敗，降級為空持倉：', message);
      // silent-severe：白屏降級是使用者看不出原因的資料問題，上報留跡（dev 為 no-op）。
      reportHandledError('holdings:derive_failed', { message });
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
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[holdings] deriveRealizedEvents 推導失敗，降級為空事件：', message);
      reportHandledError('holdings:realized_derive_failed', { message });
      return [];
    }
  }, [transactions]);
}
