# AssetAnchor — 專案開發指引

> 主計劃書（ADR-000）：`docs/portfolio_tracker_planning.md`。第 2–8 章決策已拍板，修改前須評估影響。

## Sprint × OpenSpec 工作流規則

1. **照原計劃書 §13.2 的 vertical slice 走**：一次只做一個 sprint，每個 sprint 前後端一起做（schema/邏輯 → Firestore CRUD → UI 畫面），結尾在 iOS Simulator 上可 demo。
2. **預設 1 個 sprint = 1 個 OpenSpec change**：走完整 explore →（propose → apply → archive）一輪工作流。
3. **若某個 sprint 規劃範圍太大，就拆成多個 OpenSpec change 執行**：拆分原則是各 change 要 cohesive、tasks 跑得完；當一個 sprint 明顯包含兩組以上獨立的 capability 時才拆。
4. **Sprint 1 是例外**：收尾走舊 runbook（`docs/runbook/sprint-1-status.md`），OpenSpec change 自 **Sprint 2（Accounts）** 起。

## 環境關鍵事實

- **Apple Developer Program 卡的只有「真機 build + 上架」**，不擋 MVP 開發：iOS Simulator 本機開發/看 UI 不需付費帳號（T3 go/no-go 已 PASS）。僅 **Google 登入 runtime 驗證 + 真機 dogfood** 延後到 Apple 通過後一次批量驗收。
- **Node**：machine 用 asdf（非 nvm），repo `.tool-versions` pin nodejs 22。
- **測試紀律（§13.4）**：`packages/shared` 純函式與 Firestore rules 必測（>90% / 隔離驗證）；UI 走 RNTL 只測關鍵 flow。新增 enum（transaction_type / asset_type / broker）必加對應測試。
