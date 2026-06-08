/**
 * 下一個 display_order（D6）：現有最大值 +1；空清單回 1。
 * 純函式，便於單元測試。
 */
export function nextDisplayOrder(accounts: readonly { display_order: number }[]): number {
  if (accounts.length === 0) return 1;
  return Math.max(...accounts.map((a) => a.display_order)) + 1;
}
