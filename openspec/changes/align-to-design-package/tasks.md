## 1. 文件對齊 + 消重（Phase 2，可平行，按檔案所有權）

- [ ] 1.1 planning §2/§11/§13：底部 tab 改 持倉/交易/分析/設定；§11.2 改寫（帳戶併設定、central FAB 由「否決」改「採用」）；§11.3 改 FAB-only（持倉保留 header ＋）；§11.6 分析由「未來第五 tab」改「現行 MVP tab」；回填 §11 AuthStack（SplashGate/Google/錯誤橫幅/登出 confirm）；§13.2/§13.5 nav 字眼校正
- [ ] 1.2 ADR-0003 加「已被 ADR-0008 修訂（持倉/交易/分析/設定）」橫幅，保留原決策軌跡
- [ ] 1.3 新增 ADR-0008：設計包＝產品最高權威 + nav 重構（Context→Decision→Consequences→Alternatives；alternatives 含「按領域分權」「planning 仍是母版」）
- [ ] 1.4 runbook/local-testing：帳戶建立路徑「帳戶 tab」→「設定子頁」；移除 ADR-0005 已刪的 `amounts`/`rate*` 驗證段
- [ ] 1.5 刪除 `docs/superpowers/plans/2026-05-22-sprint-0-foundation.md`、`2026-05-30-sprint-1-auth.md`、`docs/superpowers/specs/2026-05-30-sprint-1-auth-design.md`（git 留底）；openspec/specs/auth 來源註記改指 runbook
- [ ] 1.6 設計包內部矛盾 8 處修正（design.md §6 清單）；回填完成後退役 `docs/design/_planning-sync-notes.md`
- [ ] 1.7 改寫 CLAUDE.md「設計驅動工作流」段：設計包優先序、未來 change 如何引用 `*-spec.md`、conformance gate（逐畫面對圖）

## 2. WP-0 design-system 基底（Phase 3，序列最先，阻擋全部畫面）

- [ ] 2.1 `core/theme/index.ts` 改 dark-first：tokens 完整（design.md §3 的色/字/間距/圓角/漸層），匯出型別安全 theme
- [ ] 2.2 `expo-font` 載入 Nunito（500–900）+ Noto Sans TC（400–800），App bootstrap 等字型就緒
- [ ] 2.3 `packages/shared` `aNice()`（nice-number 軸刻度）先測再實作，納入 ≥90% gate
- [ ] 2.4 `core/ui` 補元件（design.md §4）：Card/Segmented/TimeTabs/Avatar/Pnl/Fab/ConfirmDialog/EmptyState/Toast/CashBalanceCard/品牌組件；Button 補 gradient+loading；`index.ts` 全匯出
- [ ] 2.5 `core/ui/charts/`（react-native-svg）：Chart(sparkline)/Donut/DualBar/HBar，對齊 prototype 簽章；加 `react-native-svg` 依賴
- [ ] 2.6 WP-0 typecheck/lint 綠；shared `test:coverage` ≥90%

## 3. WP-NAV 導航重構（Phase 3，序列第二，觸碰共用 nav）

- [ ] 3.1 `types.ts`：`MainTabsParamList` 改 持倉/交易/分析/設定（移除 Accounts tab）；新增 `AnalysisStackParamList`/`SettingsStackParamList`/`TransactionsStackParamList`；補 TransactionDetail/AssetTransactions/設定子頁 routes
- [ ] 3.2 `MainTabs.tsx`：4 tab + `tabBarIcon`（1.8 stroke：持倉/交易/分析圓餅/設定）
- [ ] 3.3 `RootNavigator.tsx`：SplashGate（取代 inline ActivityIndicator）；conditional render auth 切換
- [ ] 3.4 新建 `features/analysis/AnalysisStack`、`features/settings/SettingsStack`（掛 AccountsStack 子頁 + 顯示偏好/個資/關於）、`features/transactions/TransactionsStack`
- [ ] 3.5 交易 tab 移除 header ＋ 改 FAB；帳戶列表移除 header ＋ 改 FAB；持倉保留 header ＋
- [ ] 3.6 → CHECKPOINT 2：`core/theme` + nav 在 iOS Simulator 看過（owner 驗收）再進畫面

## 4. WP-A holdings（Phase 4，worktree）

- [ ] 4.1 HoldingsOverview 照 holdings-overview-spec §3.1：Hero count-up、2×2 Bento、走勢圖卡、Segmented(持股/帳戶/類別)、Avatar 圓標、Pnl
- [ ] 4.2 AssetDetail 照 §3.2：價格 hero、Chart+TimeTabs、TWD/USD 切換、我的持倉卡、兩個按鈕
- [ ] 4.3 個股完整交易歷史（AssetTransactions）
- [ ] 4.4 RNTL 關鍵 flow + Simulator 對圖

## 5. WP-B transactions（Phase 4，worktree）

- [ ] 5.1 TransactionList 時間軸（左日期欄、按月分組、買賣漸層膠囊、總額/已實現）
- [ ] 5.2 TransactionDetail（檢視/編輯/刪除，原幣別，ConfirmDialog）
- [ ] 5.3 Add/Edit 交易表單 retrofit（買賣 Segmented 漸層、計算預覽卡、代號搜尋/帳戶 picker/日期選擇帶入、「編輯交易」標題模式）
- [ ] 5.4 期間篩選 sheet（全部/本月/近三月/今年/自訂）
- [ ] 5.5 RNTL 關鍵 flow + Simulator 對圖

## 6. WP-C analysis（Phase 4，全新 feature，worktree）

- [ ] 6.1 `features/analysis/screens/AnalysisOverview`：hero + 5 圖表卡 + TWD/USD 全頁切換 + refresh→toast
- [ ] 6.2 類別/幣別聚合純函式（`packages/shared`，先測再做）
- [ ] 6.3 Simulator 對圖

## 7. WP-D accounts（Phase 4，worktree）

- [ ] 7.1 AccountList：色圓標（非小點）、市值、停用區、FAB
- [ ] 7.2 AccountDetail：帳戶總值 hero + 帳戶色光暈、現金 inline CashBalanceCard、持股列表、停用/刪除/重啟 ConfirmDialog
- [ ] 7.3 Add/Edit 帳戶：base-currency Segmented、色票 ×6、券商/類型選單
- [ ] 7.4 RNTL 關鍵 flow + Simulator 對圖

## 8. WP-E settings（Phase 4，依賴 WP-NAV/WP-D，worktree）

- [ ] 8.1 Settings 分組清單（帳戶/偏好/其他）+ 我的帳號 card + 登出 ConfirmDialog
- [ ] 8.2 顯示偏好（幣別 TWD/USD + 主題）、個人資料編輯、關於（三子頁）
- [ ] 8.3 Simulator 對圖

## 9. WP-F auth（Phase 4，worktree）

- [ ] 9.1 SignIn：品牌 lockup（圓環錨點）、密碼 eye、inline 驗證、auth 錯誤橫幅、按鈕 spinner、Google ghost 鈕、demo「略過登入」
- [ ] 9.2 SignUp 同上 retrofit；ForgotPassword 寄信成功全屏態
- [ ] 9.3 SplashGate 畫面（WP-NAV 已接線）
- [ ] 9.4 RNTL 關鍵 flow + Simulator 對圖

## 10. 缺畫面 / 狀態（Phase 4，分散各 WP）

- [ ] 10.1 股票代號搜尋、帳戶 picker、日期選擇器、券商/類型選單（隨 WP-B/WP-D）
- [ ] 10.2 Loading skeleton、離線/抓取失敗態、首次引導（隨對應畫面）

## 11. 驗收 + 收尾（Phase 5）

- [ ] 11.1 全 workspace typecheck/lint；shared `test:coverage` ≥90%；既有 RNTL 不退化
- [ ] 11.2 逐畫面 iOS Simulator 對圖驗收（owner）
- [ ] 11.3 開 PR（merge 由 owner 本人按）；archive `align-to-design-package` + sync specs（navigation/design-system/analysis 進 `openspec/specs`）
