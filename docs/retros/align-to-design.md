# 視覺驗收 Runbook — align-to-design（手動）

> 🧊 **凍結歷史紀錄（retro）**：本檔是 align-to-design-package（全畫面對齊設計稿，2026-06-15）的逐畫面視覺驗收清單與當時 checklist 快照，已從 runbook 歸檔至 retros、不再更新。權威來源：OpenSpec change `align-to-design-package`（archive 後在 `openspec/changes/archive/`）與 `docs/adr/0008-design-package-as-source-of-truth.md`；通用的 seeded-emulator 啟動方式已併入 `docs/runbook/local-testing.md`。
>
> 建立：2026-06-15。對應 branch **`feature/align-to-design`**（**PR #8**）。
> 寫給「一週後回來、沒有上下文」的自己：照著做就能在 iOS Simulator 逐畫面對照設計稿驗收。

---

## 0. 這是什麼 / 現在卡在哪

- `align-to-design-package` 已完成 **Phase 0–4**；**PR #8 開著、尚未 merge**（merge 鍵由你本人按）。
- 設計稿（產品最高權威，對照基準）＝ `docs/design/app-prototype/`（見 ADR-0008）。
- 本 runbook ＝ 在 Simulator 手動逐畫面比對設計稿的步驟。
- **merge 後還有最後一步**：archive OpenSpec change `align-to-design-package` + sync 三個 spec（navigation / design-system / analysis）進 `openspec/specs/`。回來時跟 AI 說「archive align-to-design」即可。
- 若你回來時 PR #8 **已 merge**，那就改在 `main` 上做（步驟一樣）。

## 快速參考

| 項目           | 值                                                                           |
| -------------- | ---------------------------------------------------------------------------- |
| 測試帳號       | `test@assetanchor.dev` / `test1234`                                          |
| Emulator UI    | http://localhost:4000                                                        |
| 設計稿並排比對 | 雙擊 `docs/design/app-prototype/AssetAnchor-app.standalone.html`（離線單檔） |
| repo           | `/Users/sean.wang/Documents/Sean/project/AssetAnchor`                        |

---

## 步驟

### 0. 前置

```bash
cd /Users/sean.wang/Documents/Sean/project/AssetAnchor
git checkout feature/align-to-design     # 或 main（若 PR #8 已 merge）
pnpm install                             # 確保 Phase 3/4 新依賴（svg/linear-gradient/font/zod）都裝好
```

### 1. 起本地 emulator（帶種子資料）— 開一個 terminal 並保持開著

```bash
pnpm --filter @assetanchor/firebase emulators
```

- 會 import `.emulator-data`：1 測試帳號 + 4 帳戶 + 12 筆交易 + 匯率。
- 開 http://localhost:4000 可直接核對 Firestore / Auth 內容。
- 資料若空掉或想重置：**另開** terminal 跑 `pnpm --filter @assetanchor/firebase seed:emulator`。
- ⚠️ emulator 是 in-memory + 檔案快照：用上面這個 `emulators` 指令啟動才會 import/export；別用裸 `firebase emulators:start`（那個關掉就清空）。

### 2. Build + 跑 App（Phase 3 加了原生模組，**要重 build 一次**，不是 Metro reload 能吃到的）

另一個 terminal：

```bash
pnpm --filter @assetanchor/mobile exec expo prebuild --clean -p ios   # 只 iOS（避開 Android google-services 缺口）
pnpm --filter @assetanchor/mobile ios                                 # build + 啟動 Simulator
```

- 之後純改 JS 只要在 Metro 按 `r` reload；**除非再加原生模組才需重 prebuild**。

### 3. 登入（關鍵）

- App 落在 SignIn → **用 `test@assetanchor.dev` / `test1234` 登入**。
- ⚠️ **不要用「略過登入」來看資料**——那是另一個空 uid，看不到種子資料（它只適合純看 Auth 畫面）。
- emulator 要在跑、且 `.env` 的 `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true`（已設）。

### 4. 逐畫面對照設計稿

重點看**版型 / 視覺 / 互動**對不對。**數字方面**：市值 / 今日損益 / Hero 真值目前是 mock 示意（Sprint 5 才接報價），別當真。

**啟動 / Auth**

- [V] SplashGate：深色底 + 圓環錨點 logo
- [V] SignIn：品牌 lockup、Email/密碼欄（密碼眼睛切換）、錯誤橫幅、Google 鈕、略過登入連結
- [V] SignUp、ForgotPassword（送出後「寄信成功」全屏態）

**底部導航**

- [V] 4 tab：**持倉 / 交易 / 分析 / 設定**，圖示（清單 / 交易 / 圓餅 / 齒輪，細線）
- [V] 全深色；數字圓潤等寬（Nunito tabular）、中文 Noto Sans TC
- [V] 帳戶**不在 tab**（在 設定 → 帳戶管理）

**持倉**

- [V] 總資產 Hero（開啟有 count-up 動畫）
- [V] 2×2 Bento（總報酬率帶光暈 / 總未實現 / 今日 / 本月已實現）
- [V] 走勢圖卡 + Segmented（持股 / 帳戶 / 類別 切換重新分組）
- [V] 持股列（代號圓標 + 市值 / 漲跌%）；header 右上 **＋**
- [V] 點一檔 → AssetDetail：現價 hero、Chart + TimeTabs、**TWD/USD 切換**、我的持倉卡、「為此標的新增交易」「查看完整交易歷史」（後者 → 個股交易史）

**交易**

- [V] 時間軸版型（左日期欄、按月分組、**買/賣漸層膠囊**）
- [V] 右下 **FAB**、header **無 ＋**；點 FAB → 新增交易（買/賣漸層切換 + 即時計算預覽卡）
- [V] 點一筆 → 詳情（編輯 / 刪除）；期間篩選（全部 / 本月 / 近三月 / 今年）-> ✅ 交易日期欄打不進字/渲染空白已修復（根因：DateField 把共用 Input 再包一層致 flex 塌陷；改直接用 Input + 日曆 icon 走 rightSlot。workflow round1, 2026-06-15）

**分析**

- [V] 單頁捲動：hero + 5 圖表卡（資產配置 donut、市值vs成本、報酬率 / 未實現 / 市值佔比）
- [V] **TWD/USD 全頁切換**；右上 refresh → toast

**設定**

- [V] 分組清單（帳戶 / 偏好 / 其他）+ 我的帳號卡（logo + email）
- [V] 帳戶管理 → 列表（**色圓標**、停用區、FAB）→ 詳情（**帳戶色光暈**、現金 **inline 編輯**）-> ✅ 已修復：AccountList 加左上返回鍵（navigation.goBack 回設定）；帳戶管理與現金餘額共用同一 Accounts 子頁，一次解決兩入口。workflow round1, 2026-06-15
- [~] 顯示偏好（TWD/USD + 主題）、個人資料、關於 -> ⏸️ 個人資料「儲存」＝刻意未接後端（純 UI + demo 提示，非 bug；見「已知範圍邊界 #3」）。要真正寫回（Firebase updateProfile + users/{uid}）需另開 change。**已決定（2026-06-15）：本 branch merge 後另開新的 OpenSpec change 接上，不混入本輪。**
- [V] 登出 → 確認對話框 → 回 SignIn

### 5. 回報

哪些畫面 OK、哪些要調（截圖最好），跟 AI 說即可直接修。

---

## 已知範圍邊界（別誤判成 bug）

1. **市值 / 今日損益 / Hero 真值、SELL / 已實現損益**：需即時報價，屬 Sprint 5；目前畫面以 mock 示意、SELL 表單顯示「尚未開放」。
2. **交易日期**：目前是 `YYYY-MM-DD` 受控文字欄，原生日曆 picker 待後續。
3. **顯示偏好（幣別 / 主題）、個人資料編輯**：UI 先行，尚未寫回後端。
4. **舊資料 `DecimalError`**：Sprint 4 攤平 schema（ADR-0005）前建立的交易 doc 缺 `total/fee/tax` 會讓持倉頁丟錯。種子資料是新 schema、不受影響；但若你之後接到舊資料，需補 `deriveHoldings`/`Money` 防禦或一次性遷移（建議當獨立小 fix）。

## 相關文件

- 設計權威：`docs/design/app-prototype/`、各 `docs/design/<feature>/*-spec.md`
- 規則：`docs/adr/0008-design-package-as-source-of-truth.md`、`CLAUDE.md`「設計驅動工作流」
- change：`openspec/changes/align-to-design-package/`（proposal / design / tasks / specs）
- 一般本地測試 / emulator：`docs/runbook/local-testing.md`
- 種子腳本：`firebase/scripts/seed-emulator.mjs`
