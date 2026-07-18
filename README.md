# AssetAnchor

個人投資組合追蹤 App — 整合跨券商（Firstrade、Interactive Brokers、群益、富邦等）的**台股（TWD）＋美股（USD）＋加密貨幣（USDT）**部位：記錄交易、即時報價、持倉與已實現損益推導、多幣別換算合計、資產配置分析。

> **狀態**：MVP feature-complete，TestFlight 內部測試中（現行版本 `0.0.3`）。
> 主計劃書（ADR-000）：[`docs/portfolio_tracker_planning.md`](docs/portfolio_tracker_planning.md) · 開發憲法與 DoD：[`CLAUDE.md`](CLAUDE.md)

## 功能總覽

- **持倉總覽**：持股市值 hero（count-up）、2×2 摘要卡（總報酬率／未實現／今日／本月已實現）、資產走勢圖、持股／帳戶／類別三種分組
- **交易**：BUY/SELL 記錄（手續費＋交易稅入成本）、日期區間篩選、複製上一筆、個股交易歷史
- **報價**：Yahoo Finance 15 分鐘延遲報價（台股／美股／crypto）、每日 USD/TWD 匯率、走勢圖多 range 歷史
- **分析**：資產配置圓餅圖（enum 驅動）、帳戶市值雙柱圖
- **多帳戶**：券商帳戶管理（識別色）、現金餘額、per-account 持倉
- 導航＝底部 4 tab：**持倉 / 交易 / 分析 / 設定**（帳戶管理為設定子頁）

## 技術棧

- **App**：Expo SDK 54 / React Native 0.81 / React 19 / React Navigation v7 / Zustand
- **後端**：Firebase（Firestore + Auth + Cloud Functions asia-east1）＋ `@react-native-firebase` v24 modular API
- **共用**：pnpm workspaces monorepo、TypeScript strict（`noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`）、decimal.js（Money 精度紀律，ADR-0005）
- **品質**：ESLint + Prettier + Husky + commitlint（Conventional Commits）+ Jest + GitHub Actions + Maestro/AXe（iOS e2e）
- **觀測**：Sentry（`assetanchor-mobile`）

## 架構

Top-view 元件圖與報價流程 sequence 見 [`docs/architecture.md`](docs/architecture.md)。

```
apps/mobile        # Expo RN app（feature-based：features/* → core|services|shared 單向依賴）
apps/functions     # Cloud Functions：quotes / exchangeRates / symbols / history（tsup → lib/）
packages/shared    # 跨端純函式：enums / types / zod schemas / Money（ESM、以 source 消費）
firebase/          # firestore.rules + indexes + rules 測試 + emulator seed script
docs/              # 設計包(權威) / ADR / runbook / tech_note / retros / qa
openspec/          # OpenSpec 規格與 change 流程（explore→propose→apply→archive）
```

三條不可違反的核心紀律（完整憲法見 [`CLAUDE.md`](CLAUDE.md)）：

1. **設計包＝UI 最高權威**（[`docs/design/`](docs/design/)，ADR-0008）——衝突時設計贏
2. **Money/decimal 紀律**（ADR-0005）——金錢禁用 native number，Firestore 存 10 位小數 canonical string
3. **Firestore schema＝聖牛**——變更須逐欄評估三端影響＋owner gate

## 本地開發

完整步驟（種子資料、冒煙測試、疑難排解）見 [`docs/runbook/local-testing.md`](docs/runbook/local-testing.md)。

```bash
# 環境：Node 22（asdf，.tool-versions pin）+ pnpm 9.12.0（corepack）
corepack enable && pnpm install

# Terminal 1：Firebase emulators（Auth :9099 / Firestore :8080 / UI :4000）
pnpm --filter @assetanchor/firebase emulators        # 需本地報價時改用 emulators:fn（含 Functions :5001）

# Terminal 2：iOS app（Metro :8081；EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true 自動接 emulator）
pnpm --filter @assetanchor/mobile ios

# 種子帳號：test@assetanchor.dev / test1234
```

## 品質 gate（DoD 摘要）

單一權威定義在 [`CLAUDE.md`](CLAUDE.md)「通過開發的標準」。常用指令：

```bash
pnpm -r typecheck                                  # 全 workspace tsc --noEmit
pnpm -r lint                                       # 全 workspace eslint
pnpm exec prettier --check .                       # 格式
pnpm --filter @assetanchor/shared test:coverage    # shared 純函式（coverage gate ≥90%）
pnpm --filter @assetanchor/mobile test             # mobile 純邏輯
pnpm --filter @assetanchor/firebase test:rules     # Firestore rules（自動起 emulator）
```

測試取捨走 ADR-0007 獎盃模型：純函式 TDD 必測、rules 隔離必測、UI 只測關鍵資料流（RNTL）、其餘手動 dogfood ＋ Maestro e2e（[`apps/mobile/.e2e/`](apps/mobile/.e2e/)）。

## CI/CD

- **CI**（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)，GitHub-hosted runner）：PR→main 與 push main 觸發，四個平行 job——`lint`（prettier + eslint）、`typecheck`、`test`（shared+mobile coverage）、`rules`（JDK 21 + Firestore emulator 跑 rules 測試）。四項皆為 main 的 **required checks**（strict：分支須基於最新 main）。
- **Git 工作流**：GitHub Flow——單一 `main` 恆可發布、短命 `feature/*`／`fix/*` 分支、一律 PR、CI 綠即快速 merge（誰 merge 依 [`CLAUDE.md`](CLAUDE.md) 分級授權）。⚠️ Stacked PR 注意：**保留 base 分支時 GitHub 不會自動把子 PR 轉向 main**（只有刪除 base 分支才會）——依序 merge 後務必確認內容真的進了 main。
- **CD＝刻意手動**（花錢／部署屬人類介入 gate）：
  - **iOS**：定期從 main 切 TestFlight build——從 main 打 `x.y.z-release` tag 即觸發 [`release-ios.yml`](.github/workflows/release-ios.yml)（驗證 tag 在 main 上＋版號＝package.json → EAS 雲端 build + auto-submit）；手動 EAS CLI 備援與細節見 [`docs/runbook/testflight-release.md`](docs/runbook/testflight-release.md)
  - **後端**：`firebase deploy`（functions / rules / indexes）手動執行
- **版號單一來源**：`apps/mobile/package.json` 的 `version`——`app.config.ts` 與 About 頁皆 import 之；iOS build number 由 EAS remote `autoIncrement` 管理，不入 repo。

## 開發工作流

每個 change 走 OpenSpec（explore→propose→apply→archive；[`openspec/`](openspec/)）；帶 UI 的 change 必引 [`docs/design/`](docs/design/) 對應 spec 並過 iOS Simulator 視覺對圖。自主開發循環（/goal、harness 兩層框架）見 [`docs/runbook/goal-dev-cycle.md`](docs/runbook/goal-dev-cycle.md)。

文件地圖：[`docs/adr/`](docs/adr/)（跨 change 決策）· [`docs/design/`](docs/design/)（高保真設計包＋可操作原型）· [`docs/runbook/`](docs/runbook/)（可重複操作程序）· [`docs/tech_note/`](docs/tech_note/)（技術教學）· [`docs/retros/`](docs/retros/)（sprint 回顧）· [`docs/qa/`](docs/qa/)（視覺稽核報告）

## License

MIT — 見 [`LICENSE`](LICENSE)。
