import { z } from 'zod';
import { BROKERS } from '../enums/brokers.js';
import { ACCOUNT_TYPES } from '../enums/account-types.js';
import { MARKETS } from '../enums/markets.js';

/** MVP 幣別範圍：schema 預留多幣別，但帳戶建立/編輯只收 USD / TWD（planning doc §2 / §5）。 */
const MVP_CURRENCIES = ['USD', 'TWD'] as const;

/** #RRGGBB 十六進位色碼。 */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * AddAccount / 編輯帳戶的表單輸入驗證（planning doc §6 + spec「帳戶欄位驗證」）。
 * runtime 驗證，型別由 z.infer 推導；對應 AccountDocument 的使用者可編輯子集。
 */
export const accountInputSchema = z.object({
  account_name: z.string().trim().min(1, '帳戶名稱必填'),
  // enum 欄位一律帶繁中訊息——zod 內建英文訊息會裸露 enum 內部值於 UI（visual-audit P0-1）
  broker: z.enum(BROKERS, '請選擇券商'),
  account_type: z.enum(ACCOUNT_TYPES, '請選擇帳戶類型'),
  base_currency: z.enum(MVP_CURRENCIES, '請選擇基礎幣別'),
  market: z.enum(MARKETS, '請選擇主要市場'),
  color: z.string().regex(HEX_COLOR, '需為 #RRGGBB 色碼'),
  notes: z.string().default(''),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
