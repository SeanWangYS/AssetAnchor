import type { QuoteStaleness } from '@assetanchor/shared';
import { staleNoticeFor } from './staleNotice';

// Local-time timestamps so the M/D HH:mm output is deterministic in any time zone.
const STUCK = new Date(2026, 8, 22, 17, 10).getTime();
const RECENT = new Date(2026, 9, 21, 12, 48).getTime();

const base: QuoteStaleness = { level: 'fresh', oldestMs: null, ageDays: 0, hardCount: 0, total: 0 };

describe('staleNoticeFor', () => {
  it('returns null while quotes are fresh', () => {
    expect(staleNoticeFor(base)).toBeNull();
    expect(staleNoticeFor({ ...base, oldestMs: RECENT, total: 7 })).toBeNull();
  });

  it('shows a dated soft line past 1 hour', () => {
    expect(staleNoticeFor({ ...base, level: 'soft', oldestMs: RECENT, total: 7 })).toEqual({
      kind: 'soft',
      text: '報價更新於 10/21 12:48',
    });
  });

  it('shows the age and the stuck time when every quote is past 24 hours', () => {
    expect(
      staleNoticeFor({ level: 'hard', oldestMs: STUCK, ageDays: 29, hardCount: 7, total: 7 }),
    ).toEqual({ kind: 'hard', text: '報價已 29 天未更新（停在 9/22 17:10）' });
  });

  it('counts affected quotes when only some are past 24 hours', () => {
    expect(
      staleNoticeFor({ level: 'hard', oldestMs: STUCK, ageDays: 5, hardCount: 1, total: 7 }),
    ).toEqual({ kind: 'hard', text: '1 檔報價已逾 1 天未更新' });
  });

  it('returns null when a non-fresh level has no timestamp (defensive)', () => {
    expect(staleNoticeFor({ ...base, level: 'soft' })).toBeNull();
  });
});
