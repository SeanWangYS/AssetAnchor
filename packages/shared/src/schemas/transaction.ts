import { z } from 'zod';
import Decimal from 'decimal.js';
import { MARKETS } from '../enums/markets.js';
import { ASSET_TYPES } from '../enums/asset-types.js';

/** MVP 幣別範圍：schema 預留多幣別，但 MVP 交易只收 USD / TWD（planning doc §2 / §5）。 */
const MVP_CURRENCIES = ['USD', 'TWD'] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 是否為合法的 YYYY-MM-DD 真實日期（擋 2024-13-01 / 2024-01-32 等）。 */
function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 安全解析為有限 Decimal；非數字 / NaN / Infinity / 空字串回 null。 */
function parseFinite(s: string): Decimal | null {
  try {
    const d = new Decimal(s);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

/** 大於 0 的金額/數量字串（單價、股數）。 */
const positiveDecimal = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => {
      const d = parseFinite(v);
      return d !== null && d.gt(0);
    }, `${label}需為大於 0 的數字`);

/** ≥ 0 的金額字串（手續費、稅）。 */
const nonNegativeDecimal = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => {
      const d = parseFinite(v);
      return d !== null && d.gte(0);
    }, `${label}不可為負數`);

/**
 * AddTransaction 表單輸入驗證（planning doc §6 TransactionDocument 的 BUY 單幣別子集）。
 * runtime 驗證，型別由 z.infer 推導。金額/數量在此只驗形（正負、數字性），
 * 實際精度轉換交由 Money 在組文件階段處理（見 ADR-0007 純轉換 seam）。
 */
export const transactionInputSchema = z.object({
  account_id: z.string().trim().min(1, '帳戶必填'),
  symbol: z
    .string()
    .trim()
    .min(1, '代號必填')
    .transform((s) => s.toUpperCase()),
  market: z.enum(MARKETS),
  asset_type: z.enum(ASSET_TYPES),
  // MVP 只做 BUY；SELL 與公司行動等留待後續 sprint
  transaction_type: z.literal('BUY'),
  transaction_date: z.string().trim().refine(isRealDate, '日期需為 YYYY-MM-DD'),
  original_currency: z.enum(MVP_CURRENCIES),
  quantity: positiveDecimal('股數'),
  price: positiveDecimal('單價'),
  fee: nonNegativeDecimal('手續費').default('0'),
  tax: nonNegativeDecimal('交易稅').default('0'),
  notes: z.string().default(''),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
