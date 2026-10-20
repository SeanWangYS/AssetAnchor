## Why

2026-09 GCP 免費試用到期，Cloud Functions 全被拒、報價停更近一個月，但持倉總覽仍「看起來正常」：註腳「最後更新 HH:mm」**沒有日期**且取的是**最新**一檔的 `fetched_at`（`Math.max`），過期揭露又只是一句灰色「部分為最後已知報價（延遲）」——owner 完全沒察覺數字是舊的，財報損益因此失真。同時 owner 於 2026-10-21 拍板 hero 精簡（design spec D7/D8，PR #78）：資訊重複、說明文字過載，偏好簡潔。兩者都落在 hero 區，故合併為一個 change。

## What Changes

- **Hero 精簡（D7）**：移除大數字下方的變動行（`▲ 未實現　+%　全期`，與 bento「總報酬率 / 總未實現」重複）與灰色說明行（「市值/今日為報價即時計算（最後更新 HH:mm · 延遲 15 分鐘）；不含現金；成本與已實現來自實際交易」）；口徑說明改寫為英文程式碼註解（憲法 #10）。hero 平常只剩 label「持股市值（{幣別}）」+ 大數字。
- **報價過期兩級提示（D8，平常完全隱藏）**：以「持有中標的報價的**最舊** `fetched_at`」判定——
  - 慢 **> 1 小時**：大數字下方淡色小字 `報價更新於 M/D HH:mm`（**必含日期**）
  - 慢 **> 1 天**：橙色警示框 `⚠︎ 報價已 N 天未更新（停在 M/D HH:mm）` + 「重試」（強制刷新），大數字同時變淡
  - 既有「N 檔報價更新中 / N 檔查無代號」降級提示 + 重試保留；舊的「部分為最後已知報價（延遲）」在持倉總覽由兩級提示取代
- **shared 純函式（TDD）**：報價新鮮度分級（fresh / soft / hard + 最舊時間 + 天數 + 受影響檔數）與 `M/D HH:mm` 日期時間格式化。
- **BREAKING（UI 文案）**：持倉總覽不再顯示「不含現金」註腳——此為 2026-07-17 視覺稽核 P1-4 所加；owner 2026-10-21 決定移除（label「持股市值」已表達口徑），改記於程式碼註解。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `live-quotes`：「報價 as-of 時間可見」由常駐「最後更新 HH:mm」改為**異常才出現、含日期、以最舊報價判定**的兩級提示；「雙層 cache 讀取與現價/損益顯示」中持倉總覽 hero 的過期標示改依兩級門檻（15 分鐘 ~ 1 小時不提示）；新增報價新鮮度分級純函式 requirement。
- `currency-display`：持倉 hero「註腳 SHALL 明示不含現金」移除（label 與純持股市值口徑不變）。

## Impact

- **程式碼**：`apps/mobile/src/features/holdings/screens/HoldingsOverviewScreen.tsx`（hero 區）；`packages/shared/src/quotes/`（新鮮度分級）、`packages/shared/src/format/date.ts`（日期時間格式）及其測試。
- **不動**：Firestore schema、rules、Cloud Functions、報價抓取流程（`quotesStore`）、`AssetDetailScreen`（其「最後更新 HH:mm · 延遲」維持）。
- **依據**：`docs/design/holdings-overview/holdings-overview-spec.md` D7/D8（PR #78）＋互動原型 `holdings-redesign-mock.html`；planning §3（MVP 功能範圍：持倉總覽為核心畫面）、§13.4（shared 純函式 TDD + coverage ≥ 90%）。
- **Gate**：帶 UI → owner merge + iOS Simulator 視覺對圖（ADR-0008）。無 schema / Money 精度 / 部署變更。

## Non-goals

- 帳戶詳情、分析頁的過期揭露（維持現狀；owner 2026-10-21 決定只改持倉總覽）。
- client 端錯誤回報（Sentry 等）、後端加固（App Check、`maxInstances`）——另案（B 階段 ②⑦）。
- bento 第 4 格改年化報酬率（XIRR，另一 change ⑤）、持股清單改表格（另一 change ⑥）。
- 逐列（row）過期標記、推播通知等第二階段功能。
