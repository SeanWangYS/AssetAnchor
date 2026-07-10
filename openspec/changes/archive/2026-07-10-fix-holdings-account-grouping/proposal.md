## Why

TestFlight dogfood 發現：持倉總覽切到 **「帳戶」分群**時，owner 的 7 檔持股只有 1 檔碰巧歸對帳戶，其餘歸到「—」或**根本不存在的帳戶**（畫面出現「富邦證券」，但 owner 只有 Firstrade 與群益證券）。

根因（5-agent 調查 + production 截圖 + code 親驗，7/7 零殘差定罪）：**「帳戶」分群完全沒讀交易的 `account_id`**，而是用一張寫死在 `apps/mobile/src/features/holdings/holdingsDemo.ts` 的 `DEMO_ACCOUNT`（symbol→券商名）demo 對照表——那張表是 Sprint 4 抄設計原型 mock（`docs/design/holdings-overview/holdings-overview-spec.md` 的 4 帳戶 demo）留下的暫時 stub，本應由未執行的 `complete-reconciliation` change 接真實資料，卻直接上了 production。`AssetDetailScreen` 的「帳戶分布」欄同源同病。

這違背設計權威：holdings-overview-spec §3.1 item 6/7 明定「帳戶」模式 SHALL **依券商（真實帳戶）分組**（設計贏，ADR-0008；此處 code 偏離設計、非設計缺失）。

順帶修一個同畫面的 dogfood UX：持倉總覽「本月已實現損益」bento 在**本月無賣出**時顯示綠色「▲ NT$ 0」，暗示「上漲」，導致 owner 誤判為計算 bug（調查已確認計算正確、無 SELL→0 屬正解）。應改為中性空狀態顯示。

本 change 純 mobile 顯示/推導接線，**不動 Firestore schema（聖牛）/ functions / rules**，風險低、可獨立 ship。

## What Changes

- **「帳戶」分群改用真實 `account_id`（核心）**：以每個帳戶各自的交易推導持倉（per-account derivation），分組標題用**真實帳戶名**（`account_name`，來自 `accountsStore`）＋檔數＋原幣別小計，取代 `accountOf(symbol)` demo 表。交易 `account_id` 對不到任何現存帳戶者，歸入「未分類」群（fail-soft，不靜默消失）。
- **移除 demo stub**：刪除 `holdingsDemo.ts` 的 `DEMO_ACCOUNT` / `accountOf`（含其硬編的「富邦證券 / Interactive Brokers」等 owner 不存在的帳戶）。
- **`AssetDetailScreen`「帳戶分布」同修**：由 `accountOf(symbol)` 改為從交易解析出實際持有該 `(market, symbol)` 的帳戶名（可能多個帳戶）。
- **「本月已實現損益」空狀態（同畫面 UX）**：本月無任何 SELL 事件時，bento 顯示中性文案（如「本月無賣出」或灰色「—」）而非綠色「▲ NT$ 0」；並將 inline 的「本月」過濾 + 換算加總邏輯抽成 `packages/shared`/`holdingsHero` 的純函式，補月邊界 / 跨年 / 多幣別 / 負值單元測試（現為零測試）。

## Capabilities

### New Capabilities

（無——修改既有 `holdings-derivation` 的顯示/分群行為，不新增 capability。）

### Modified Capabilities

- `holdings-derivation`：
  - **新增需求「持倉清單『帳戶』分群依真實帳戶」**：帳戶模式 SHALL 以真實 `account_id` per-account 推導分組（復用既有 `deriveHoldingsForAccountSafe`），標題用 `account_name`；orphan `account_id` 歸「未分類」；不得使用 symbol→帳戶 demo 對照。
  - **新增需求「本月已實現損益指標的空狀態」**：無當月 SELL 事件時 SHALL 顯示中性空狀態，不以綠色上漲樣式呈現 NT$ 0；月度過濾/加總 SHALL 由具測試的純函式提供。

## Impact

- **程式碼（純 mobile + shared 純函式）**：
  - `apps/mobile/src/features/holdings/screens/HoldingsOverviewScreen.tsx`：`buildSections` 的「帳戶」模式改用 per-account 推導 + `accountsStore`；「本月已實現損益」bento 空狀態。
  - `apps/mobile/src/features/holdings/holdingsDemo.ts`：刪除 `DEMO_ACCOUNT` / `accountOf`（demo 債清除）。
  - `apps/mobile/src/features/holdings/screens/AssetDetailScreen.tsx`：「帳戶分布」改真實解析。
  - `apps/mobile/src/features/holdings/holdingsHero.ts`（或同層純函式）：抽出 `realizedInMonth`（月過濾 + 換算加總）+ 單元測試。
  - `packages/shared/src/portfolio/`：復用既有 `deriveHoldingsForAccountSafe`；若需「跨全部帳戶的分組推導」薄封裝則新增純函式 `deriveHoldingsByAccount(transactions, accounts)` + 測試。
- **不影響**：Firestore schema（聖牛，無變更）、`firestore.rules`、`apps/functions`、報價/匯率管線（沿用現況）。
- **依賴方向**：HoldingsOverviewScreen 已 import `transactions/transactionsStore`（既有跨 feature store 讀取慣例）；本 change 增讀 `accounts/accountsStore` 同型，不新增結構性違規（`eslint.config.mjs` 未 enforce import 邊界；仍以既有慣例為準）。
- **DoD**：帶 UI → 收尾須過 iOS Simulator 逐畫面視覺對圖（owner gate，基準 `docs/design/holdings-overview/holdings-overview-spec.md` §3.1 item 6/7/103、§3.2 item 5）；`deriveHoldingsByAccount` / `realizedInMonth` 純函式走 TDD + shared 90% coverage gate（ADR-0007 獎盃模型：資料流正確性屬該測）；screen 接線屬 plumbing 走手動 dogfood + Maestro E2E（已有 `.e2e/` 套件）。

## Non-goals

- **「類別」分群的髒資料症狀**：owner 有 `market=US` 的台股 ETF（另一 prod bug 遺留），會讓「類別」模式歸進「美股 · TWD」怪組——那是**資料**問題（既有 `guard-transaction-market-consistency` 已擋未來輸入、待清歷史髒資料），非本 change 的分群邏輯問題，不在範圍。
- **帳戶詳情頁「成本 vs 市值」B 案**：屬後續 change `account-detail-market-value`（成本＋現值並列、spec A5 增修、估值上移 services/），不在本 change。
- **讀取路徑 zod 驗證**（`transactionsStore` 直接 cast 未驗證）：屬資料韌性 backlog，不在本 change。
- **`RealizedEvent` 加 `account_id`（per-帳戶已實現損益）**：屬未來需求，涉型別擴充（聖牛紀律），不在本 change。
- **`Pnl` 元件全域「0 一律中性」**：本 change 僅處理「本月已實現損益無事件」的空狀態；是否讓 `Pnl` 全域 0 中性屬設計決策，列 follow-up 交 owner。
