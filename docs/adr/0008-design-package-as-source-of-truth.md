# ADR-0008: 設計包為產品最高權威（UI 真理凌駕 planning 與 code）

- **狀態**：Accepted
- **日期**：2026-06-14
- **修訂**：ADR-0003（導航結構，4-tab 持倉/交易/帳戶/設定 → 持倉/交易/分析/設定）
- **相關**：planning doc §2/§11/§13、`docs/design/`（`_READ-ME-FIRST.md`、`README.md`）、整合原型 `docs/design/app-prototype/`；於 OpenSpec change `align-to-design-package` 落地

## Context

AssetAnchor 是兩條平行線長大的：後端／邏輯（Sprint 0–4）對著抽象規格做、前端畫面是設計定稿前的功能骨架。設計包（`docs/design/`，整合原型 `docs/design/app-prototype/`）後來才定稿並經 owner（唯一設計開發者）拍板。結果是**三方真理漂移**：

- **code** 的底部導航仍是舊 4-tab（持倉／交易／帳戶／設定）、`core/theme` 是中性 light-mode 佔位（iOS 藍 `#0A84FF`）；
- **planning §11 / ADR-0003** 也還是舊 4-tab nav；
- **設計稿**已收斂為 持倉／交易／分析／設定（帳戶降為設定子頁、交易新增入口改 FAB-only）、dark-first 藍紫系統。

三者對導航與視覺各執一詞，現況近乎 100% 畫面不符設計。需要先定「誰說了算」，否則每個 UI change 都要重新仲裁。owner 已將設計包定稿並宣告為產品最高權威。

## Decision

### 1. 設計包＝產品最高權威（單一視覺契約）

`docs/design/`（衝突時以整合原型 `docs/design/app-prototype/` 為準，見 `_READ-ME-FIRST.md:29`）為產品在 **UI 一切面向**（導航、畫面、視覺、互動）的最高事實來源，**凌駕 planning doc 與既有 code**。衝突時**設計贏**；planning／ADR／CLAUDE.md／code 一律對齊設計，不是反向。各畫面像素級細節以對應 `docs/design/<feature>/*-spec.md` 為準。

### 2. 唯一但書——金額儲存精度仍歸 Money/decimal.js

設計稿自陳其數字僅為顯示層示意（`holdings-overview-spec.md:181`）。**金額／數量／匯率／成本的儲存與運算精度，仍由 `packages/shared` 的 `Money`（decimal.js）與 ADR-0005 治理**，設計包對此明示讓位。除此一處，UI 其餘面向設計包說了算。

### 3. 導航重構為 持倉 / 交易 / 分析 / 設定

依設計包權威導航樹（`README.md:22`、`analysis-page-spec.md` D9）：

- 底部 tab **恰好 4 個**：持倉 / 交易 / 分析 / 設定。
- **帳戶降為設定子頁**（設定 → 帳戶管理），不再是 tab。
- **交易頁新增入口改 FAB-only**（移除 header ＋）；**持倉頁保留 header ＋**（唯一保留 header ＋ 的 tab）。
- **新增「分析」tab**（單頁垂直捲動 hero + 圖表卡）。
- **新增 SplashGate**（app 啟動 gate → 依 auth state 落地）。

## Consequences

- **planning / ADR-0003 / CLAUDE.md / code 全部回填對齊**：planning §2/§11/§13 改寫新 nav；ADR-0003 加「已被 ADR-0008 修訂」橫幅（保留歷史）；CLAUDE.md 架構/導航段更新 tab 清單 + 新增「設計驅動工作流」規則；mobile 重構 `core/navigation`、重寫 `core/theme`、逐畫面 retrofit。
- **未來每個帶 UI 的 change 必須引用設計**：OpenSpec design 階段須引相關 `docs/design/<feature>/*-spec.md` + `docs/design/app-prototype/`，並通過**逐畫面 iOS Simulator 視覺對圖（visual conformance gate）**才算完成；缺對應 spec 的畫面，先補 spec 再實作。
- **設計包內部矛盾要修**：定稿過程留下若干自相矛盾（如 spec 殘留舊 tab 名稱、plan 與 spec 對圖表維度不一），由本 change 一次性清理，使設計包本身內部一致、可被當作唯一契約。
- **代價**：設計包成為高權威文件，其變更牽動下游；好處是 AI 協作有單一視覺真理可循、開發準確度提升、消除三方仲裁成本。

## Alternatives Considered

- **按領域分權（design 管 UI、planning §6 管 schema）**：讓設計包只在 UI 面向最高、資料 schema 仍以 planning §6 為母版，各管一塊。否決——owner 要設計包**無歧義地居於最上位**，分權會在邊界地帶（如顯示格式 vs 儲存格式）再生仲裁成本；改以「設計最高 + 單一但書（Money/decimal.js）」表達，邊界唯一且明確。
- **planning 仍是母版、設計只是輸入**：設計包視為一份待回填的輸入，必須先反向同步進 planning 才取得權威。否決——回填節奏慢、過程中漂移持續存在，且與「設計已定稿、要立即據以實作」的現實相悖。最終選擇：**設計包最高權威**，文件反向對齊設計。
