/** 顯示名稱長度上限（產品決定的保守值，非 schema 約束；單點管理便於日後調整）。 */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** 顯示名稱驗證結果：通過時帶 trim 後的值，否則帶拒絕原因。 */
export type DisplayNameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too_long' };

/**
 * 驗證待寫回的顯示名稱（純函式）。trim 後不得為空、長度 ≤ DISPLAY_NAME_MAX_LENGTH。
 * 供 mobile 在寫入 `users/{uid}.display_name` 前 gate，並回傳正規化（trim）後的值。
 */
export function validateDisplayName(raw: string): DisplayNameValidation {
  const value = raw.trim();
  if (value.length === 0) return { ok: false, reason: 'empty' };
  if (value.length > DISPLAY_NAME_MAX_LENGTH) return { ok: false, reason: 'too_long' };
  return { ok: true, value };
}
