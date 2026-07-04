/**
 * 沿已排序的日期軸 forward-fill：缺日（假日 / Yahoo FX null bar 被略過的日期）
 * 補前一個已知收盤；首個已知值之前的日期無值可填、不輸出。
 * 純函式；價格為 Money 10 位小數 string，原樣傳遞不運算。
 */
export function forwardFillSeries(
  axis: readonly string[],
  closes: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  let prev: string | undefined;
  for (const date of axis) {
    const close = closes[date] ?? prev;
    if (close === undefined) continue;
    out[date] = close;
    prev = close;
  }
  return out;
}
