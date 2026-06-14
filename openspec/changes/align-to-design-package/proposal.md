## Why

AssetAnchor 的前端 UI 設計（`docs/design/`，整合原型 `app-prototype/`）已定稿並經 owner 拍板為**產品最高權威**。但專案是兩條平行線長大的：後端/邏輯（Sprint 0–4）對著抽象規格做、前端畫面是設計定稿前的功能骨架。結果是三方真理漂移——**code 的導航仍是舊 4-tab（持倉/交易/帳戶/設定），planning §11 / ADR-0003 也還是舊 nav，但設計稿已是 持倉/交易/分析/設定（帳戶降為設定子頁、交易 FAB-only）**；且 `core/theme` 仍是中性 light-mode 佔位（iOS 藍 `#0A84FF`），與設計的 dark-first 藍紫系統完全不符——**現況 100% 畫面不符設計**。

本 change 把「設計稿＝最高權威」這條規則正式制度化（ADR-0008），並一次性把**所有文件與所有 code 對齊到設計稿**：文件去漂移＋消重、建立設計系統程式基底、重構導航、逐畫面 retrofit 到各自 `*-spec.md`。目標是讓後續 AI 協作有單一視覺契約可循、開發準確度提升。

## What Changes

- **規則（最高優先序）**：新增 ADR-0008——設計包（`docs/design/app-prototype/`）為產品最高權威，凌駕 planning doc 與既有 code；衝突時設計贏、其餘對齊。改寫 `CLAUDE.md` 的「設計驅動工作流」段，定義未來每個 change 如何引用設計與 conformance gate。
- **導航重構（BREAKING，nav 樹）**：底部 4 tab 改 **持倉 / 交易 / 分析 / 設定**；帳戶管理從 tab 降為「設定」子頁；交易頁新增入口改 **FAB-only**（持倉頁保留 header ＋）；新增 SplashGate。
- **設計系統程式基底**：`core/theme` 改 dark-first + 完整 tokens（藍紫 accent、漲跌綠紅、買賣漸層、Nunito/Noto 字型、8px 網格、圓角）；`core/ui` 由 4 個補到 ~16 個元件 + `core/ui/charts/`（react-native-svg）；`packages/shared` 加 `aNice()` 純函式。
- **逐畫面 retrofit**：holdings / transactions / accounts / auth / settings 既有畫面照各自 `*-spec.md` 重建；新增 **analysis** feature；補 ~11 個缺的畫面/狀態（顯示偏好、個資、關於、單帳戶交易、代號搜尋、帳戶 picker、日期選擇、券商/類型選單、SplashGate、skeleton、離線/錯誤態）。
- **文件對齊＋消重**：planning §2/§11/§13 改新 nav + 回填 `_planning-sync-notes` 決策；ADR-0003 加「已被 ADR-0008 修訂」橫幅；runbook/local-testing 修 nav 路徑 + 移除 ADR-0005 已刪的舊 schema 驗證段；**刪除**兩個已完成 sprint 大計劃（sprint-0 2581 行、sprint-1 1616 行）＋ sprint-1 design spec（已被取代、無 live 引用）；修設計包 8 處內部矛盾、退役 `_planning-sync-notes.md`。

## Capabilities

### New Capabilities

- `navigation`: 權威導航結構——底部 4 tab（持倉/交易/分析/設定）、帳戶為設定子頁、各畫面新增入口慣例（持倉 header ＋、交易/帳戶 FAB）、SplashGate、登入狀態驅動落地、Modal group（AddTransaction / AddAccount / 期間篩選 sheet）。
- `design-system`: 設計系統契約——dark-first design tokens、core/ui 元件清單、顯示格式規則（▲▼、`NT$`/`US$` 前綴、`tabular-nums`、漲跌綠紅 vs 買賣漸層兩套獨立色系）、Money 精度交給 decimal.js 的顯示層原則。
- `analysis`: 分析頁——單頁垂直捲動 hero + 5 張圖表卡（資產配置 donut、市值vs成本 雙柱、報酬率/未實現/市值佔比 橫條）、TWD/USD 全頁切換、refresh→toast、無 drill-down；圖表為 react-native-svg 自繪靜態呈現（真實資料第二階段）。

### Modified Capabilities

本 change **不改任何既有 capability 的行為 spec**。交易/帳戶的新增入口改 FAB 屬導航層、已併入 `navigation`；`auth` / `account-management` / `transaction-entry` / `holdings-derivation` / `currency-display` 僅做視覺 retrofit 對齊設計稿，行為不變、不改既有 spec。

## Impact

- **docs**: planning §2/§11/§13 改寫、ADR-0003 橫幅、**新增 ADR-0008**、runbook/local-testing 修正、**刪** 3 個舊 sprint 文件、設計包 8 處內部矛盾修正 + 退役 `_planning-sync-notes.md`、改寫 `CLAUDE.md`。
- **apps/mobile**: `core/theme`（dark-first 重寫）、`core/ui/*`（補 ~12 元件 + `charts/`）、`core/navigation/*`（4 tab + 子頁 + FAB + Splash）、`features/{holdings,transactions,accounts,auth,settings}` 全畫面 retrofit、新增 `features/analysis`、~11 缺畫面、`i18n/zh-TW` 字串、`expo-font`（Nunito/Noto）。
- **packages/shared**: `aNice()` 純函式 + 測試（≥90% gate）；分析頁類別/幣別聚合純函式。
- **依賴**: `react-native-svg`（圖表）、`expo-font` + 字型資產。
- **驗收**: 逐畫面 iOS Simulator 對圖；shared 純函式單元測試；既有 RNTL/typecheck 不退化。

## Non-goals

對齊 MVP 邊界（planning §3 / §13.2；設計稿 `_READ-ME-FIRST.md:76` 同列為未來），本 change **明確排除**：

- **報表 tab、CSV 匯入、配息（DIVIDEND）交易類型**（第二/三階段）。
- **真實圖表資料 / 走勢歷史 / 年化報酬率圖**：圖表用設計稿假資料/placeholder 呈現視覺，接真實報價與歷史淨值留待 Sprint 5+。
- **市值 / 未實現損益 / 今日損益 / 總資產 Hero 的真實值**（需即時報價，Sprint 5）——畫面照設計呈現，數字沿用 mock 或既有衍生值。
- **真機 Google 登入 runtime 驗證 / EAS dogfood**（Apple 通過後批量驗收）。
- **i18n**（UI 字串純繁中，集中於 `i18n/zh-TW`）。
- **`preferred_display_currency` 顯示偏好寫入後端**（DisplayPrefs 只做 UI；落地留待後續）。
