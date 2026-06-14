import { useEffect, useRef, useState } from 'react';

/**
 * 數字 count-up（持倉總覽總資產 Hero；prototype `useCountUp`，design §3.1 item 3 / §4）。
 *
 * 進場時從 0 ease-out 漲到 target（約 0.95s）。以 requestAnimationFrame 逐幀更新，
 * 並用 setTimeout 保底（背景節流時 rAF 可能停擺，時間到仍跳到最終值）。
 * 純展示用 number（charting / 動畫容許失精度，金額本身仍由 Money 算）。
 */
export function useCountUp(target: number, durationMs = 950): number {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    // 同一 mount 內 target 變動：直接定到新值（不重播動畫）。
    if (started.current) {
      setValue(target);
      return;
    }
    started.current = true;

    let raf = 0;
    let t0: number | null = null;
    const ease = (x: number): number => 1 - Math.pow(1 - x, 3);
    const step = (t: number): void => {
      if (t0 === null) t0 = t;
      const p = Math.min((t - t0) / durationMs, 1);
      setValue(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const fallback = setTimeout(() => setValue(target), durationMs + 80);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, [target, durationMs]);

  return value;
}
