/**
 * 日期顯示政策（visual-audit P2-3；spec: currency-display）：
 * 完整日期 `YYYY/MM/DD`、時間戳 `YYYY/MM/DD HH:mm`。
 * 表單輸入維持 ISO `YYYY-MM-DD`（輸入格式，不在此收斂）；
 * Firestore Timestamp unwrap 屬 IO 邊界、留在 mobile（此處只收純轉換）。
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` → `YYYY/MM/DD`；非 ISO 形狀原樣回傳（防禦）。 */
export function formatDisplayDate(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) return isoDate;
  return isoDate.replaceAll('-', '/');
}

/** `YYYY/MM/DD HH:mm`（本地時間、補零）。 */
export function formatDisplayDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${p(date.getMonth() + 1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
