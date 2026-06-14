# 交易紀錄（Transactions）— 高保真設計定稿

> 設計交接文件 · v1 · 2026-06-12
> 對應 `docs/portfolio_tracker_planning.md` §11 TransactionsStack（TransactionList + TransactionDetail）與 §3 MVP 交易紀錄管理。
> 沿用 holdings-overview 視覺系統。整合版 prototype 見 `../app-prototype/`。

---

## 0. 範圍

1. **交易列表**（交易 tab）— 時間軸版型（版型 B）
2. **交易詳情** — 檢視＋編輯＋刪除
3. **日期區間篩選** — bottom sheet（唯一篩選維度）

> 設計稿/原型，mock 資料 12 筆（含 3 筆賣出、1 筆虧損賣出）。

---

## 1. 探索歷程（為什麼是版型 B）

三版型並排比較（見 `exploration/AssetAnchor-transactions-layouts.standalone.html`）：

| 版型 | 買賣標記 | 金額 | 結果 |
|---|---|---|---|
| A 分組列表 | avatar 角標 ＋/− | 帶正負號 | 未選 |
| **B 時間軸** | 漸層膠囊（標的前） | 無正負號 | ✅ 採用 |
| C 卡片分組 | row 左緣漸層短桿 | 無正負號 | 未選 |

---

## 2. 設計決策

| # | 決策 | 說明 |
|---|---|---|
| T1 | 版型 B 時間軸：左側日期欄（日大字＋月小字，同日合併）＋ 按月分組 header（含筆數） | |
| T2 | 買/賣標記＝主題漸層膠囊：買 `#7C5CE6→#C24FD6`、賣 `#2E74E6→#35C6EA` | 與新增交易 sheet 同一套；**不用**台股紅綠 |
| T3 | row 內容：膠囊＋名稱＋代號／股數×單價；右側總金額（含手續費，原幣別）；賣出加「已實現 ±金額」（漲跌色） | 帳戶名不進列表（詳情看） |
| T4 | **新增交易入口＝FAB only**，header 不放 ＋ | 使用者拍板，更新 planning §11.3 的雙入口設計 |
| T5 | 篩選只做日期區間：header 日曆鈕＋「期間」pill → bottom sheet（全部/本月/近三月/今年 presets ＋ 自訂起訖），套用鈕顯示命中筆數 | |
| T6 | 詳情頁：標的＋類型膠囊 → 交易內容卡（日期/股數/單價/手續費/總成本或總收入，**原幣別**；賣出加已實現損益）→ 編輯/刪除 | 單幣別事件：交易只存原幣別、**無多幣別換算卡 / amounts map**（model B / ADR-0005）；跨幣別合計改在持倉/分析頁以最新匯率顯示時換算 |
| T7 | 編輯＝複用新增交易 sheet 帶入原值，標題改「編輯交易」 | 無獨立編輯頁 |
| T8 | 純列表：無頁面統計、無分組小計 | 使用者選「最乾淨」 |

---

## 3. 互動

| 互動 | 行為 |
|---|---|
| 點 row | push 交易詳情 |
| 詳情 編輯 | 開 sheet（帶原值、買/賣狀態、日期） |
| 詳情 刪除 | 關閉＋toast（實作時需 confirm） |
| 日曆鈕 / 期間 pill | 開篩選 sheet；preset 即時計算筆數；套用後過濾列表並更新 pill |
| FAB | 開新增交易 sheet（空白） |

---

## 4. 與 RN 實作對應

| 元素 | 落點 |
|---|---|
| 列表/詳情 | `features/transactions/screens/TransactionList` / `TransactionDetail` |
| 日期分組邏輯 | `packages/shared`（純函式：今天/本週/按月） |
| 膠囊/日期欄/row | `core/ui/` |
| 篩選 sheet | `features/transactions/components/DateRangeSheet` |
| FAB | `core/ui/`；**planning §11.3 需更新**：交易頁移除 header ＋ |

## 5. 待辦

- [x] 刪除 confirm dialog（2026-06-13 完成，見 app-prototype）
- [x] 空狀態：篩選無結果（含重設動作）（2026-06-13）
- [x] 個股完整交易歷史（資產詳情 → push，含累計買賣/現持摘要行）（2026-06-13）
- [ ] 配息（DIVIDEND）row 樣式（第二階段）
- [ ] 自訂起訖的日期選擇器

## 6. 資料夾結構

```
transactions-page/
├── transactions-page-spec.md            ← 本文件
└── exploration/
    └── AssetAnchor-transactions-layouts.standalone.html  ← 三版型＋詳情＋篩選並排
```
定稿整合於 `../app-prototype/`（交易 tab）。
