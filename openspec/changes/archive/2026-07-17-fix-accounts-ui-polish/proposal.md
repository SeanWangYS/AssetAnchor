## Why

視覺稽核六項帳戶畫面缺陷：**P2-7**（詳情現金卡檢視態顯示裸數字 `158000.00`——TextInput 直接當顯示元件、無千分位）；**P2-8**（清單「—」一符多義：無持股/已停用/有現金無持股看起來相同）；**P2-9**（停用確認框「軟刪除」開發術語見客）；**P3-12**（AddAccount 無明示關閉鈕、識別色 8 顆 vs spec A7 ×6、色塊無 accessibility label）；**P3-13**（hero「未實現」標籤與數值被斷行拆開；停用帳戶現金編輯入口仍在）；**P3-14**（清單副標「券商 · TW」——raw enum 直出且與 spec A2「類型·市場」不符）。

## What Changes

- **P2-7**：`CashBalanceCard` 檢視態（`editable=false`）改渲染 Text（非 TextInput），值由 screen 以千分位 + 2 位格式化（對齊帳戶 hero 現金「NT$ 158,000.00」慣例）。
- **P2-8**（**依 spec A2/A3 內解法**——稽核建議的「清單值含現金」與 spec A2「不放現金、保持單行」明文衝突，設計贏）：啟用帳戶無持股 → 顯示「無持股」（不再與停用同符號）；已停用 → 維持「—」（spec A3 明文）+ 既有「已停用」分區與灰階。
- **P2-9**：停用確認框文案 → 「停用後帳戶會收進「已停用」區、不再列入統計；可隨時重新啟用。」（去「軟刪除」jargon；spec A8 的「軟刪除」為工程規格用語、非 UI 文案，不需改 spec）。
- **P3-12**：AddAccount 畫面補明示關閉鈕；`ColorSwatches` 每色補 `accessibilityLabel`（色名）；**色票 8 → 6**（spec A7 ×6 為準；既有帳戶若存第 7/8 色仍正常渲染，僅新選單收斂——owner 拍板項）。
- **P3-13**：hero「未實現」標籤+數值+百分比包成不可拆行群組；停用帳戶隱藏「編輯現金」入口。
- **P3-14**：清單副標改「類型 · 市場」（spec A2）——順修 raw enum「TW/US」直出（繁中市場標籤）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `account-management`：清單副標 SHALL 為「類型 · 市場」（繁中標籤）；無持股/已停用 SHALL 可區分；停用文案 SHALL NOT 用開發術語；檢視態現金 SHALL 格式化顯示；表單 SHALL 有明示關閉、色票對齊 spec ×6 且具 a11y label。

## Impact

- **apps/mobile**：`AccountListScreen`、`AccountDetailScreen`、`core/ui/CashBalanceCard.tsx`、`core/ui/ColorSwatches.tsx`、`core/theme/index.ts`（ACCOUNT_COLORS 8→6）、`AddAccountScreen`（關閉鈕）、`accountDisplay.ts`（市場繁中標籤 helper）。
- **不影響**：packages/shared、Firestore schema、functions、rules、docs/design（P2-8 依 spec 解、P2-9 不動 spec）。
- **owner gate**：帶 UI → 視覺對圖 + owner merge。**Stacked on PR #63**（實質依賴止於 #61 shared format/#62 Pnl；接車隊尾為 rebase 便利）。owner 拍板項：①「無持股」標籤文案②停用文案③色票 8→6（fallback：改 spec A7 為 ×8）。

## Non-goals

- 不做清單值含現金（spec A2 明文不放；帳戶市值含現金語意已由 Detail hero 承載）。
- 不做已停用帳戶的現金「檢視」隱藏（僅隱藏編輯入口——檢視餘額仍有資訊價值）。
- 不動 AccountForm 欄位結構與驗證（P0/P1 已修 re-validate）。
