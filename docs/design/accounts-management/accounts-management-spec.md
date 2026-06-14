# 帳戶管理（Accounts）— 高保真設計定稿

> 設計交接文件 · v1 · 2026-06-12
> 對應 `docs/portfolio_tracker_planning.md` §3 MVP 帳戶管理與 §6 accounts schema。
> 位置：**設定 → 帳戶管理**（導航變更後帳戶不再是 tab）。整合版 prototype 見 `../app-prototype/`。

---

## 0. 範圍

1. **帳戶列表**（含「已停用」區）
2. **帳戶詳情**（現金餘額 inline 編輯／持股／帳戶資訊／停用·刪除）
3. **新增／編輯帳戶**（共用表單 bottom sheet）

---

## 1. 設計決策

| # | 決策 | 說明 |
|---|---|---|
| A1 | **帳戶識別色回歸（修訂 holdings D3）**：列表圓標用帳戶色漸層、詳情頁頂部光暈用帳戶色；持股列表仍不用色點 | schema `color` 欄位保留；Tweaks 可關閉比較 |
| A2 | 列表 row：色標 monogram＋帳戶名／類型·市場；右側＝該帳戶持股市值（原幣別） | 不放現金/檔數，保持單行 |
| A3 | 已停用帳戶收在列表底部，灰階降明度、市值顯示 — | 對應 `is_active` 軟刪除 |
| A4 | 新增帳戶入口＝**FAB**（同交易頁慣例，無 header ＋） | |
| A5 | 詳情 hero＝帳戶總值（持股＋現金，基礎幣別）＋ 拆分小字 | |
| A6 | **現金編輯＝卡片 inline 編輯（B 案）**：檢視態右上「編輯」→ 卡片切換輸入態（TWD/USD 兩欄）→ 儲存/取消 | 三案比較後拍板；卡片含「手動快照 · 更新於」對應 `cash_balances_updated_at` |
| A7 | 表單欄位：名稱／券商（enum 選單）／帳戶類型／基礎幣別（segmented）／識別色 swatches ×6／備註 | 新增與編輯共用 |
| A8 | 刪除前提示需先處理交易紀錄；停用＝軟刪除可復原 | referential integrity |
| A9 | 拖曳排序（display_order）以文字註記示意，MVP 不畫互動 | |

### 現金編輯三案比較（exploration 留檔）

| 案 | 形式 | 結果 |
|---|---|---|
| A | bottom sheet 表單（兩幣別一次存） | 未選 |
| **B** | 卡片 inline 編輯（不離開頁面） | ✅ 採用 |
| C | 數字鍵盤 sheet（單一幣別） | 未選 |

---

## 2. 互動

| 互動 | 行為 |
|---|---|
| 設定 → 帳戶管理 | push 帳戶列表 |
| 點帳戶 row | push 帳戶詳情（光暈換該帳戶色） |
| 現金卡 編輯 | inline 輸入態（聚焦基礎幣別欄）→ 儲存 → toast、數值更新 |
| FAB | 開新增帳戶 sheet |
| 停用／刪除 | toast demo（實作需 confirm） |

---

## 3. 與 RN 實作對應

| 元素 | 落點 |
|---|---|
| 列表/詳情 | `features/accounts/screens/AccountList` / `AccountDetail`（**navigation 移入 SettingsStack**） |
| 現金 inline 編輯 | `features/accounts/components/CashBalanceCard`（本地 state → 儲存時寫 `cash_balances` ＋ `cash_balances_updated_at`） |
| 表單 sheet | Modal group `AddAccount`（planning §11 已預留） |
| monogram／swatches | `core/ui/` |

## 4. 待辦

- [x] 停用/刪除 confirm dialog（刪除在有交易時為單鈕提示型）（2026-06-13 完成，見 app-prototype）
- [x] 已停用帳戶的「重新啟用」入口（詳情頁，含 confirm）（2026-06-13）
- [x] 無持股空狀態（2026-06-13）
- [ ] 該帳戶交易列表入口（AccountTransactions，未進本版）
- [ ] 券商/類型選單的選擇頁

## 5. 資料夾結構

```
accounts-management/
├── accounts-management-spec.md          ← 本文件
└── exploration/
    └── AssetAnchor-accounts-screens.standalone.html  ← 列表/詳情/表單＋現金編輯三案
```
定稿整合於 `../app-prototype/`（設定 → 帳戶管理）。
