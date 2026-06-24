# iOS Simulator 自動化 + E2E 計劃 — 可行性評估 Report

> 評估對象：[`ios-simulator-automation-e2e-plan.md`](./ios-simulator-automation-e2e-plan.md)（撰於 2026-06-15）
> 評估日期：**2026-06-22** ｜ 方法：多 agent workflow（17 agents，4-way 探查 → 12 條高風險論點對抗式查證 → 綜合）
> 環境：Expo SDK 54 / RN 0.81.5、New Arch ON、本機 macOS 15.3.1 + **Xcode 16.4** + Java(Temurin) 26、iPhone 16 Pro Simulator。

---

## 總結論：**可行（feasible-with-caveats）**

計劃**根本上成立、研究品質高**：五個推薦工具全部真實、現役、維護狀態與 plan 所述一致；環境條件對計劃**有利**（Java 已超標、Apple 帳號 gate 不卡任何 Sim-only 工具、`ios/` 已 prebuild）；三條目標 flow 的畫面/入口/導航**今天都在 code 裡**；最深的技術論點（RN #45798 根因 + `collapsable={false}` 修法、Maestro 走 XCUITest 故與架構無關）**對照 primary source 全部成立**。

但有 **1 個硬前置（testID）** 與**數條過期/過廣描述**要在動工前修正，以及一個 plan 沒涵蓋、由查證新發現的 **env-specific 風險**（兩個 OPEN 的 Maestro issue 可能正好打到本機這組 macOS/Xcode 組合）。因此建議**先花 1 天做 de-risk spike 當 go/no-go gate**，再投入 testID instrumentation。

| 維度 | 評估 |
|---|---|
| 工具現況（AXe / ios-simulator-mcp / Maestro / idb / mobile-mcp） | ✅ 全部查證成立、現役 |
| 技術論點正確性（7 條 caveat） | ✅ 5 條 correct/mostly、2 條需修正（CJK 過廣、Xcode 26 bug 過期） |
| 程式碼就緒度 | 🟡 顯著缺口：**全 app 零 testID** |
| 環境/流程約束 | 🟢 有利，含 2 個硬前置（testID、CI 無 macOS runner） |
| 整體 | **feasible-with-caveats** |

---

## 1. 工具現況查證（web，as of 2026-06-22，皆對照 primary source）

| 工具 | plan 宣稱 | 查證結果 | 狀態 |
|---|---|---|---|
| **AXe** (cameroncooke/AXe) | v1.7.1 2026-06、active、brew | ✅ **v1.7.1 = 2026-06-02**（CHANGELOG + GitHub API 三方一致）、MIT、2047★、月更 | confirmed |
| **ios-simulator-mcp** (joshuayoes) | ~2k★, MIT, v1.6.0 2026-04, 包 idb, Sim-only | ✅ 2.1k★、v1.6.0 = 2026-04-21、wraps idb+simctl、macOS-only | confirmed |
| **Maestro** (mobile-dev-inc) | 免特製 build、New-Arch 免疫、自帶 MCP、Java17+ | ✅ active **2.x（最新 2.6.1 / 2026-06-12）**；iOS Sim 為官方預設路徑；MCP 確有；Java 17+ 確需 | confirmed |
| **idb** (facebook/idb) | stale，最後 release v1.1.8 2022-08 | ✅ release 確實停在 v1.1.8（2022-08）。**nuance**：main branch 仍有 commit 到 2026-06（但無 release）→ "prefer AXe" 正確 | confirmed |
| **mobile-mcp** (mobile-next) | ~5.2k★, Apache-2.0, 跨平台 | ✅ 5.2k★、Apache-2.0、v0.0.59（2026-06-09）。**flag**：仍 0.0.x，API churn 較快 | confirmed |

**需修正的工具描述：**
- **「AXe 包 idb」不精確**：AXe 是把 idb 的**底層 XCFramework**（FBSimulatorControl 等）**靜態連進單一 binary**（無 daemon），**不是 wrap idb CLI**。真正 wrap idb CLI 的是 ios-simulator-mcp。這也解釋了**為何 AXe 不受 idb CLI 停更影響**（但仍共用同一套 private CoreSimulator API，故 Xcode 升級後仍要重驗 → caveat #5 成立）。
- **Maestro 未 pin 版本**：plan 用 `curl | bash` 不指定版本；2.0 起才把 Java 門檻拉到 17（並換 GraalJS 引擎）。runbook 應 pin 版本避免漂移。

---

## 2. 技術論點查證（7 條 caveat，web + RN/Maestro primary source）

| # | 論點 | 判定 | 重點 |
|---|---|---|---|
| 1 | AXe/idb `type` 走 raw HID、僅 US layout、打不進 Fabric TextInput | **mostly-correct** | HID/US-only **確認**（AXe 官方 docs：non-ASCII 報 `unsupportedCharacter`）。但**因果有誤**：本 app 打不進的真因是 RN #45798（focus→view-flatten→立即 blur），非「Fabric 忽略硬體鍵盤」此一般性質。修了 `collapsable={false}` 後其實打得進，只是非 US/CJK 仍會亂碼 → **操作結論（別用 raw-HID 打 RN TextInput）仍對** |
| 2 | pbcopy + Cmd+V 走 UIKit `insertText`，Fabric 接受 | **mostly-correct** | 方向正確、與 ADR-0009 觀察一致。風險：需先 focus 欄位；其可靠性本身曾被 Xcode 26.4 剪貼簿 bug 影響；最 fiddly，能用 Maestro inputText 就別用它 |
| 3 | Maestro `inputText` 走 XCUITest → 與架構無關 | **correct** | **確認**：Maestro iOS driver 是 Swift XCTest runner 經 WDA 走 XCUITest；maintainer 已關閉 New-Arch 相容 issue #2202（2025-11）；RN 官方自己用 Maestro 跑 new-arch e2e |
| 4 | Fabric view-flattening 丟掉沒標記節點 → 需 testID | **correct** | **確認**（RN view-flattening docs + Maestro best-practice：testID→`accessibilityIdentifier` 為 iOS 黃金選擇器）。注意：這正是 maintainer 講的 "a little view flattening" — 影響**元素探索**，非打字機制 |
| 5 | 繁中/CJK **必須**走剪貼簿 | **oversimplified** ⚠️ | 前提（HID 不能打 CJK）對，但**結論過廣**：Maestro **自己的 iOS `inputText` 自 2023 起支援 unicode**（issue #146）→ flow (b)/(c) 的繁中**很可能不必走剪貼簿**。剪貼簿強制令**只對 raw-HID/AXe 路徑成立**，不對 Maestro Phase 3 |
| 6 | Xcode 26 剪貼簿同步 bug，需 `pbpaste\|pbcopy` re-prime | **mostly-correct（已過期）** ⚠️ | bug 真實（Xcode **26.4**，Apple Forums 820393 等），但**已於 26.4.1（2026-04-16）/ 26.5 修復**，比 plan 撰寫早約 2 個月；**且本機跑 Xcode 16.4 根本不適用** → re-prime 無害但多餘 |
| 7 | New-Arch 鍵盤 bug 根因 = view-flattening（RN #45798）、修法 `collapsable={false}` | **correct** | **完全確認**：RN #45798 maintainer @coado 原文描述 remove+insert mutation 致 onBlur；本 repo `Input.tsx:42` 正是此修法、ADR-0009 有記錄 |

---

## 3. 程式碼就緒度（codebase，read-only 查證）

三條 flow 的畫面與入口**都存在**：
- **登入**：`SignInScreen.tsx` Email(101)/密碼(121)/登入 Button(159)；登入後落 `持倉`（`MainTabs.tsx:34`）。
- **新增帳戶**：設定→帳戶管理（`SettingsScreen.tsx:57`）→ FAB `新增帳戶`（`AccountListScreen.tsx:115`）→ `AccountForm` 帳戶名稱(91，free-text 接繁中)。
- **新增 BUY 交易**：交易 tab FAB `新增交易`（`TransactionsScreen.tsx:88`）→ `TransactionForm` 買入/賣出 toggle 預設 BUY、股票代號(231, ASCII 大寫)、股數/單價(decimal-pad)、account/market/type/currency 為 Picker→Sheet。

種子帳號與 runbook **完全如 plan 所述**：`docs/runbook/local-testing.md` 存在，`test@assetanchor.dev / test1234`（line 35/53），emulator auth 9099 / firestore 8080 / UI 4000。

### 🚫 唯一硬前置 — 全 app 零 testID（caveat #4 的最壞情況被坐實）
- `grep testID apps/mobile/src` → **0 個**。`accessibilityLabel` 僅 21 處且都在裝飾性 icon button，**不在表單欄位上**。
- **好消息**：`core/ui/Input.tsx:57` 會 `{...rest}` spread 到內層 TextInput → `<Input testID=...>` **免改 core 即可命中**，欄位 instrumentation 很便宜。
- **真正成本**：`core/ui/Button.tsx` 是**封閉 prop 介面** `{title,onPress,variant,disabled,loading}`，**不轉發 testID**。三個 submit（登入/建立帳戶/建立交易）全走它 → 要加 submit testID 必須**改 shared `Button.tsx`**（影響全 app 每顆按鈕）→ 屬 **ADR-0008 UI 變更、owner-gated**。
- **可繞過**：**id-less Maestro 先 bootstrap** — submit 有穩定中文 title（登入/建立帳戶/建立交易）、FAB 有 accessibilityLabel、tab 用可見文字（持倉/交易/分析/設定）→ 可先證明 flow 跑得起來，再補 testID。

### 其他就緒缺口
- 無 `apps/mobile/.maestro/`、無任何 Detox/Appium 設定 → Layer 3 是 greenfield。
- `apps/mobile/ios/` 在本機已 prebuild 但 **gitignored 未 commit**（CNG 設計）→ fresh checkout 需先 `expo prebuild` + `expo run:ios`，Maestro 才有 `.app` 可測。
- **登入 skip 陷阱**：`略過登入/Demo-skip`（`SignInScreen.tsx:70-73`）會用空 uid 進 MainTabs，無種子資料 → 登入 E2E **必須斷言走真種子帳號、非 skip**（runbook line 38 已警告）。
- Picker 欄位（券商/類型/市場/幣別）非 TextInput，是 Pressable→Sheet，須 `tapOn` 欄位再 `tapOn` 中文 option label。

---

## 4. 環境/流程約束查證

| 項目 | 狀態 | 說明 |
|---|---|---|
| Java 17+（Maestro） | 🟢 ok | 本機 Temurin **26** 已裝、遠超門檻。但 Java **未 pin 在 `.tool-versions`**（只有 nodejs 22）→ 建議 pin 以保可重現 |
| Xcode 版本 | 🟡 caveat | 本機 **16.4**，與 plan 假設的「Xcode 26」不符 → plan 的 Xcode-26 剪貼簿 caveat 在此**不適用**；任何 Xcode-version-specific 宣稱無法由 repo 保證 |
| Apple Developer Program | 🟢 ok（有利） | 付費帳號只 gate 真機 build + 上架；三個工具在 iOS **全是 Sim-only**，正好落在免費區（T3 PASS）|
| CI（Phase 4 進 CI） | 🔴 不可行 | `ci.yml` 全部 job `ubuntu-latest`、**無 macOS runner** → iOS Sim/Xcode 跑不了。plan 自己已 scope 為 local-only/選用，屬硬約束非缺陷 |
| MCP session reload（Phase 2） | 🟡 caveat | `claude mcp add` 後**需重開 session** 才看得到工具 → 破壞單 session 自走（`/loop`）；Phase 1（AXe over Bash）無此 gate，是乾淨入口 |
| `ios/` prebuild | 🟢 ok（本機）| 本機已 prebuild；fresh checkout 須 `expo prebuild` + build |

> **CI 描述過期（不影響結論）**：plan 說 CI「只跑 shared test:coverage」，現在 `ci.yml` 已長出 `@assetanchor/mobile test:coverage`（line 52）與獨立 JDK-21 `rules` job（60-76）。無 macOS runner 的結論不變。

---

## 5. ⚡ 查證新發現的風險（plan 未涵蓋）

對抗式查證額外撈到**兩個 OPEN 的 Maestro upstream issue，可能正好打到本機這組環境**（macOS 15.3.1 + Xcode 16.4 + New Arch ON）：

- **#2906** — Maestro 在 Sequoia + Xcode 16 連不上 iOS Sim（卡住，疑似 idb-companion 1.1.8）。
- **#3153** — iOS Sim 在 `inputText` 期間 hang/crash，與 New-Arch 相關。

兩者皆**尚未確認於 RN 0.81 / SDK 54**，但都直接威脅 plan 的核心 `inputText` 策略 → 這就是為何下面**強烈建議先做 spike** 當 go/no-go gate。

---

## 6. 對 plan 的修正清單（動工前先改）

1. **bundle id 錯誤**：plan 範例 `com.assetanchor.mobile` → 實際 **`com.seanwangys.assetanchor`**（`app.config.ts:18`）。所有 `appId:` 與 `xcrun simctl launch` 都要改。
2. **繁中 ≠ 必走剪貼簿**：剪貼簿強制令只對 raw-HID(AXe/idb) 路徑成立。Maestro iOS `inputText` 支援 unicode → 改成「**先試 Maestro `inputText` 打繁中，失敗才 fallback pbcopy+paste**」，簡化 flow (b)/(c)。
3. **Xcode 26 剪貼簿 caveat 過期**：bug 限 Xcode 26.4、已於 26.4.1/26.5 修復；本機是 16.4 從未適用。re-prime 步驟無害但多餘 → 標註「fixed in 26.4.1+」並 pin 實際 Xcode 版本。
4. **caveat #1 因果修正**：raw-HID 打不進的真因是 RN #45798（非泛化「Fabric 忽略硬體鍵盤」）；修法已就位、欄位現在打得進，但 HID 仍會弄壞 CJK → 操作鐵律不變。
5. **「AXe 包 idb」改為「AXe 靜態連 idb 底層 framework」**（非 wrap CLI）。
6. **pin Maestro 版本**（現 2.x / 2.6.1）寫進 runbook；其餘工具都有版本號，唯 Maestro 用裸 `curl|bash`。
7. **更新 CI 描述**（已長出 mobile coverage + rules job）。

---

## 7. 風險表

| 風險 | 嚴重度 | 緩解 |
|---|---|---|
| Maestro 在本機環境（macOS 15.3.1 + Xcode 16.4 + New Arch）可能連不上/crash（#2906、#3153） | **高** | **先做 1 天 spike**：證明一條最小 flow 能連上跑通。若 hang/crash 即 go/no-go 訊號 → 退回 AXe-only 感知、等 upstream 修 |
| Instrumentation 蔓延進 shared UI：解鎖 submit 需改 `core/ui/Button.tsx`（封閉介面、影響全 app、ADR-0008 UI gate） | 中 | 先用 **id-less Maestro** 證明 flow；再把 Button.tsx testID 轉發做成**小而隔離的 owner-reviewed PR**。欄位 testID（走 Input `{...rest}`）免費、可即刻落 |
| view-flattening 丟節點 → 元素探索 flaky | 中 | 正是 testID 要解的；id-less bootstrap 後針對 flaky 元素補 testID（用 `accessibilityIdentifier`） |
| 登入 E2E 誤走 Demo-skip 空 uid → false-green | 中 | 驅動真 email/密碼欄位，登入後斷言看得到種子 artifact（4 帳戶/12 交易之一），絕不點 skip |
| Phase 2 MCP 強制重開 session + 拉進 stale idb CLI | 低 | **跳過 Phase 2**；要 MCP 就用 Maestro 自帶的 |
| 報價 UI 卡「報價載入中」（emulator 預設不跑 Functions） | 低 | 三條 flow 不需即時報價；斷言別放在報價衍生數字上 |
| Java/Maestro 未 pin → 重現漂移 | 低 | runbook pin Maestro 版本 + 記錄/pin JDK |

---

## 8. 推薦執行路徑（含 go/no-go gate）

> 第一步是**保護高風險的 gate**——先證明 Maestro 在本機跑得動，再投資 instrumentation。

- **STEP 0 — DE-RISK SPIKE（1 天，先做）**：裝 AXe + Maestro，`expo run:ios` 建好，boot iPhone 16 Pro + 種子 emulator。寫**一條丟棄式 id-less flow**：`launchApp(appId: com.seanwangys.assetanchor)` → 輸入種子帳密 → `tapOn` 文字「登入」→ 斷言落在「持倉」種子 artifact。**目標：證明 Maestro 在本機連得上跑得動（#2906/#3153 風險）**。若 hang/crash → 停 Maestro、保留 AXe-only 感知、等 upstream 修。
- **STEP 1 — Phase 1（AXe），無論如何保留（0.5 天）**：標準化 AXe-over-Bash 做截圖/點按/檢視；**絕不用 raw-HID 打 RN TextInput**。即使 Maestro 延後，這仍是長期價值。
- **STEP 2 — Instrumentation（0.5–1 天，spike 綠燈才做）**：(a) 走 Input `{...rest}` 落欄位 testID（免改 core）；(b) 改一次 shared `Button.tsx` 轉發 testID/accessibilityLabel（小而隔離、owner-reviewed、ADR-0008 gate）；(c) 修 plan 文字（bundle id / CJK / Xcode bug 過期）。
- **STEP 3 — Phase 3 三條 flow（2–3 天）**：建 `.maestro/`，順序 登入（斷言真種子帳號）→ 新增帳戶（帳戶名稱先試 `inputText` 繁中、pickers 走 label）→ 新增 BUY（全 ASCII）。穩的用 id-less，flaky 處才補 testID。
- **STEP 4 — Phase 4 本地 gate（0.5 天）**：寫成 owner 批次 merge 前的**本地** runbook 步驟（非 CI），pin Maestro + Java。
- **跳過/延後**：**Phase 2（ios-simulator-mcp）**——與 AXe 重複、多一個重開 session gate + stale idb CLI 依賴；真要 MCP 用 Maestro 自帶的。**CI E2E** 無 macOS runner，整段延後。

---

## 9. 工時估計

**~1 天 spike（gate）+ spike 綠燈後 ~3.5–5 天交付**：
Phase 0 spike 1d ｜ Phase 1 AXe 0.5d ｜ instrumentation（Input testID + Button.tsx + plan 修正）0.5–1d ｜ Phase 3 三 flow 2–3d（每條 ~0.5–1d 含視覺/斷言除錯）｜ Phase 4 本地 gate 0.5d。Phase 2 跳過。**下檔風險封頂在 ~1 天**——若 env-specific Maestro 問題成真，退回 AXe-only。

---

## 附註：本 report 怎麼產出的

多 agent workflow（17 agents，~811k tokens，~9.5 分鐘）：4-way 並行探查（codebase 就緒度 / 環境約束 / 工具現況-web / 技術論點-web）→ 對 12 條高風險/易過期論點做**對抗式查證**（預設先試圖否證、工具版本一律對 GitHub API/CHANGELOG/npm/官方 docs 三角驗證）→ 綜合。所有 codebase 宣稱附 `file:line`、工具/技術宣稱附 source。明確區分「plan 宣稱」vs「本次查證」vs「無法驗證」。
