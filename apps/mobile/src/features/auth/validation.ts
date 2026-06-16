import { z } from 'zod';

/**
 * Auth 表單 inline 驗證（auth-flow-spec §5）。
 * - Email：regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`（spec 指定，與 Firebase 前置攔截一致）。
 * - 密碼：≥ 6 碼（對齊 Firebase 最小長度）。
 *
 * 以 zod 表達（對齊專案表單驗證慣例：`packages/shared` zod + safeParse），
 * 但訊息為 auth 畫面專用繁中字串，故 schema 留在 feature 內。
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email 不可空白')
  .regex(EMAIL_REGEX, 'Email 格式不正確');

const passwordSchema = z.string().min(1, '密碼不可空白').min(6, '密碼至少 6 碼');

/** 回傳 email 欄位錯誤訊息；通過則 null。 */
export function emailError(value: string): string | null {
  const r = emailSchema.safeParse(value);
  return r.success ? null : (r.error.issues[0]?.message ?? 'Email 格式不正確');
}

/** 回傳密碼欄位錯誤訊息；通過則 null。 */
export function passwordError(value: string): string | null {
  const r = passwordSchema.safeParse(value);
  return r.success ? null : (r.error.issues[0]?.message ?? '密碼至少 6 碼');
}
