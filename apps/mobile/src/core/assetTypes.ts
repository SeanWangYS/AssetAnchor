import type { AssetType } from '@assetanchor/shared';

/**
 * 資產類型顯示標籤（繁中）——**交易表單與分析頁圓餅圖共用的單一事實來源**。
 * 新增 `asset_type` enum 值時，`Record<AssetType, string>` 的 exhaustiveness 會讓
 * typecheck 逼你在此補上標籤（唯一必要的一處），交易表單與圓餅圖即同步取得。
 */
export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  STOCK: '個股',
  ETF: 'ETF',
  CRYPTO: '加密貨幣',
  BOND: '債券',
  MUTUAL_FUND: '基金',
  OTHER: '其他',
};

/** asset_type → 顯示標籤；未知值回傳原代號（防禦）。 */
export function assetTypeLabel(assetType: AssetType): string {
  return ASSET_TYPE_LABEL[assetType] ?? assetType;
}
