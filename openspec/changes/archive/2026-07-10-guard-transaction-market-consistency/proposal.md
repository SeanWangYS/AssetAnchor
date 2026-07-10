# Proposal: guard-transaction-market-consistency

## Why

TestFlight 首個 production bug 的源頭在輸入端：台股 ETF 交易被存成 `market=US`（表單市場預設跟著帳戶 market 走、使用者沒注意），且系統對「currency=TWD × market=US」這種矛盾組合**完全不驗證**（planning §3 交易記錄、§13.4 驗證紀律）。下游的 surface-quote-symbol-errors 讓錯誤看得見，本 change 讓錯誤**進不來**。

## What Changes

- **shared 純函式一致性規則**：TW 市場交易幣別 SHALL 為 TWD、US 市場 SHALL 為 USD（CRYPTO/OTHER 不約束）；以純函式 + zod refine 實作，非法組合擋在 `safeParse`。
- **表單自動同步**：選擇市場時自動把幣別切到對應預設（TW→TWD、US→USD），減少手動出錯面。
- **代號啟發式軟警告**（非阻擋）：市場=US 但代號為純數字/台股樣式（如 `0050`、`00631L`）時，表單顯示「代號看起來像台股，請確認市場」提示；反向（TW + 純字母）亦提示。
- 新增/修改驗證規則補對應測試（§13.4）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `transaction-entry`：「交易輸入驗證（zod schema）」新增市場×幣別一致性約束；新增表單市場/幣別聯動與代號樣式軟警告 requirement。

## Impact

- `packages/shared`：`schemas/`（zod refine）+ 新純函式（`expectedCurrencyForMarket`、`symbolLooksLikeMarketMismatch`）+ 測試（coverage gate）
- `apps/mobile/src/features/transactions/components/TransactionForm.tsx`：市場選擇聯動幣別、軟警告 UI
- Firestore schema：**不動**（只是輸入驗證收緊；既有錯誤資料由使用者在 App 內編輯修正）
- 既有資料：不回溯清理（編輯既有交易時同樣過新驗證，存檔即修正）

## Non-goals

- 不做代號存在性線上驗證（打 fetchSymbolMeta 預查）——網路依賴 + 延遲，且 surface-quote-symbol-errors 已提供事後回饋
- 不改帳戶（accounts）的 market 欄位語義、不驗證「交易市場 vs 帳戶市場」（複委託帳戶可跨市場，MVP 不約束）
- 不做既有錯誤資料的批次遷移／後端修復
