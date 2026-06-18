/**
 * 把「可能缺欄位」的輸入整形成安全的十進位字串，供 `Money.fromDecimalString` 邊界使用。
 *
 * 用途（且**僅限**此用途）：pre-ADR-0005 舊 transaction doc 可能**缺**某欄位（`total`/`fee`/`tax`/
 * `quantity`）——型別標 string 但 runtime 為 `undefined`，直接丟給 `Money.fromDecimalString` 會擲
 * `DecimalError`。本函式對「缺值」（`undefined`/`null`）fail-soft：回 `fallback`（預設 '0'）。
 *
 * ⚠️ **僅處理「缺值」邊界，不處理「資料損毀」**：present-but-invalid（如 `'Infinity'`/`'NaN'`/`'abc'`/`''`）
 * **原樣通過**，交由 `Money.fromDecimalString` fail-loud（ADR-0007 §5b：髒資料必須擲錯、不可靜默歸零）。
 * 缺值 vs 損毀的分界＝「欄位是否存在」：舊 doc 缺欄位＝合法的歷史遺留（歸 0）；存在但非法＝corruption（擲錯）。
 */
export function toSafeDecimalString(value: string | undefined | null, fallback = '0'): string {
  return value == null ? fallback : value;
}
