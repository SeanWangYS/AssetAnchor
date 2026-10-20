import { formatMonthDayTime, type QuoteStaleness } from '@assetanchor/shared';

export type StaleNotice = { kind: 'soft'; text: string } | { kind: 'hard'; text: string };

/**
 * Hero stale-quote notice copy (design spec D8). Hidden while fresh; `soft` is a faint
 * dated line; `hard` names the age only when EVERY held quote is stuck, otherwise it
 * counts the affected quotes, so one bad symbol is never described as a total outage.
 */
export function staleNoticeFor(s: QuoteStaleness): StaleNotice | null {
  if (s.level === 'fresh' || s.oldestMs === null) return null;
  const at = formatMonthDayTime(new Date(s.oldestMs));
  if (s.level === 'soft') return { kind: 'soft', text: `報價更新於 ${at}` };
  if (s.hardCount === s.total) {
    return { kind: 'hard', text: `報價已 ${s.ageDays} 天未更新（停在 ${at}）` };
  }
  return { kind: 'hard', text: `${s.hardCount} 檔報價已逾 1 天未更新` };
}
