# Design: guard-transaction-market-consistency

## Context

TransactionForm 市場預設值 `initialValues?.market ?? accounts[0]?.market ?? ''`（`TransactionForm.tsx:137`）讓使用者容易在錯誤市場下輸入代號；zod schema（`packages/shared/src/schemas/`）目前只驗欄位各自合法，不驗欄位間一致性。約束：不動 Firestore schema、Money 紀律不變（ADR-0005）、UI 對齊 `docs/design/transactions-page/`＋原型（軟警告文案/樣式於視覺對圖確認）、shared 純函式 TDD + coverage gate（ADR-0007）。

## Goals / Non-Goals

**Goals**：矛盾組合（TW×USD、US×TWD）進不了 Firestore；表單聯動把「做對」變成預設路徑；台股樣式代號配美股市場即時提醒。
**Non-Goals**：代號線上存在性預查、帳戶市場 vs 交易市場驗證、既有資料批次修復（見 proposal）。

## Decisions

- **D1 一致性放 zod refine（硬擋）而非僅 UI 警告**：TW↔TWD、US↔USD 是市場交易的客觀事實，MVP 幣別只有兩種，硬擋無誤傷面；refine 進 shared schema 使 mobile 之外的未來寫入端（如批次匯入）同受保護。_替代_：只做 UI 軟警告——擋不住繞過表單的寫入，否決。
- **D2 代號樣式檢查是軟警告（不進 zod）**：啟發式有誤報可能（US 有數字開頭 ticker 的邊角），故僅提示不阻擋；純函式放 shared 以便測試窮舉樣式。
- **D3 聯動方向為 market → currency 單向**：選市場帶幣別；改幣別不反向改市場（幣別是市場的結果）。react-hook-form `watch('market')` + `setValue('currency')` 實作，沿用表單既有模式。
- **D4 錯誤訊息走 zod schema 的繁中訊息慣例**，由既有 `safeParse` 錯誤顯示路徑呈現，無新 UI 機制。

## Risks / Trade-offs

- [使用者既有錯誤資料編輯時被新驗證擋下] → 這是 feature：引導一次修正（本次 bug 的兩筆正需如此）；錯誤訊息需講清楚怎麼改。
- [啟發式誤報] → 軟警告不阻擋；文案用「請確認」而非「錯誤」。
- [自動切幣別覆蓋使用者手動選擇] → 僅在市場變動事件時切換一次，不持續強制。

## Migration Plan

純輸入層收緊，無遷移。shared（TDD）→ mobile 表單聯動與警告 → Emulator dogfood → iOS Simulator 視覺對圖（owner gate）→ PR。回退＝還原各檔。

## Open Questions

- 軟警告的確切文案與位置（欄位下方 vs 表單頂部）——視覺對圖時與 owner 定稿。
