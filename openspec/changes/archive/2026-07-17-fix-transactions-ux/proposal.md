## Why

視覺稽核六項交易/表單 UX 缺陷：**P2-9**（交易詳情常駐設計稿 annotation「編輯會開啟與『新增交易』相同的 sheet…」直接見客）；**P2-11**（台股帳戶記美股交易靜默接受——prod 曾發生 market 錯配→Yahoo 404→永遠載入中的同型事故，代號維度已有防呆、帳戶維度沒有）；**P2-14**（持倉 header 通知鈴鐺無 onPress，可見但死的控制項）；**P3-9**（選 preset 起訖欄不回填、「套用（0 筆）」可按必得空清單、FAB 遮最後一列）；**P3-10**（sheet 標題「新增買入」vs 全 app「新增交易」；本月已實現「—」無法區分 0 與無資料）；**P3-11**（從個股頁開新增交易不帶入該標的，入口 context 全丟）。

## What Changes

- **P2-9**：刪除 TransactionDetail 的開發註記行（設計稿 annotation 洩漏）。
- **P2-11**（owner 拍板項）：TransactionForm 新增**帳戶-市場**非阻斷提示（仿既有 `marketMismatchHint` 軟警告慣例）：所選帳戶.market ≠ 表單 market 時於帳戶欄下顯示「所選帳戶為台股帳戶，交易市場為美股——複委託請確認」。不阻擋送出（複委託合法）。
- **P2-14**（owner 拍板項）：**移除**通知鈴鐺（通知功能未實作，誠實 UI；原型有鈴鐺——設計偏離列 PR 置頂）。fallback：復原 + onPress 提示「即將推出」。
- **P3-9**：①選 preset 回填起訖欄為該 preset 的實際日曆區間（`presetRange` 純函式、期末訖端，「全部」清空）②套用鈕在命中 0 筆時 disable（「全部」豁免＝清除篩選恆可按）③交易清單 bottom padding 96→128（FAB 56+24+gap，不遮最後一列金額）。
- **P3-10**：①`addTitle`「新增買入」→「新增交易」（3 條 e2e flow 斷言同步）②本月已實現 count=0 時「—」補副文案「本月無賣出」（區分 0 與無資料；有實現且和為 0 → Pnl 零值中性已由 display-formatting 處理）。
- **P3-11**：`AddTransaction` route 增加 optional params（symbol/market/asset_type/currency）；AssetDetail「＋ 為此標的新增交易」帶入該標的 → 表單預填（`TransactionFormDefaults` 既有機制）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `transaction-entry`：帳戶-市場錯配 SHALL 顯示非阻斷提示；期間篩選 preset SHALL 回填實際起訖、命中 0 筆 SHALL 不可套用；新增交易入口 SHALL 傳遞標的 context；sheet 標題統一「新增交易」。
- `navigation`：無功能的 header 控制項 SHALL NOT 出現（鈴鐺移除）。

## Impact

- **apps/mobile**：TransactionDetailScreen（刪註記）、TransactionForm（帳戶-市場提示）、HoldingsOverviewScreen（鈴鐺移除、本月已實現副文案）、DateRangeSheetScreen + dateRangeStore（presetRange 回填 + 0 筆 disable，含測試）、TransactionsScreen（padding）、i18n/zh-TW.ts（addTitle）、navigation/types + AssetDetailScreen + AddTransactionScreen（params 預填）、`.e2e/*.yaml` ×3（「新增買入」斷言同步「新增交易」）。
- **不影響**：packages/shared、Firestore schema、functions、rules。
- **owner gate**：帶 UI → 視覺對圖 + owner merge。**Stacked on PR #62**（HoldingsOverview 等同批檔案）。owner 拍板項：①鈴鐺移除（原型偏離）②帳戶-市場提示文案③「新增買入」→「新增交易」文案。

## Non-goals

- 不做通知功能（鈴鐺移除即收案；未來功能另議）。
- 不做帳戶-市場**阻斷**驗證（複委託為合法情境，僅軟提示）。
- 不引第三方 date picker（P1-3 已定受控輸入慣例）。
- 不動「本月已實現」計算邏輯（僅顯示層副文案）。
