# iOS Simulator 自動化 + E2E 測試啟用計劃

> 讓 **Claude Code（CLI agent）能自主「觀察 + 操控」iOS Simulator 並跑 E2E 測試**，供未來自主開發 / debug 使用。
> 狀態：**Proposed（尚未實作）** ｜ 日期：2026-06-15 ｜ 對應環境：Expo SDK 54 / RN 0.81.5、iPhone 16 Pro Simulator、Firebase 本地 Emulator。
> 讀者：未來某個沒有上下文的 Claude Code session（或 Sean）。照本文 Phase 1→4 執行即可。

---

## TL;DR 推薦

**採用三層堆疊：`AXe`（感知/操控原語）＋ `ios-simulator-mcp`（讓 Claude Code 以 MCP tool 呼叫）＋ `Maestro`（可重跑的 E2E flow）。**

最關鍵的一條鐵律先講：**不要用 AXe / idb 的 `type` / `ui text` 對 RN `TextInput` 打字**——它走 raw HID（等同實體鍵盤），會踩到 Fabric TextInput 忽略硬體鍵盤事件的 bug（今天我們才遇到、靠 `newArchEnabled:false` 暫時繞掉）。**文字輸入一律走：(a) Maestro `inputText`（走 XCUITest typing），或 (b) `pbcopy` + Cmd+V 貼上（走 UIKit `insertText`）。繁中（CJK）只能用 (b)。**

| 用途                          | 工具                  | 為什麼                                                          |
| ----------------------------- | --------------------- | -------------------------------------------------------------- |
| 看畫面 / 點按 / 截圖（ad-hoc）| **AXe**（CLI）        | 主動維護、`--label` 直接命中元素、比 idb 穩                     |
| 讓 Claude Code 當 tool 呼叫   | **ios-simulator-mcp** | 包好的 MCP，少寫 Bash glue；Sim-only 正好符合我們被卡的 Apple 帳號 |
| 可重跑的 E2E 旅程             | **Maestro**           | 免特製 build、**對 New Architecture 免疫**、YAML 最好讓 AI 寫   |

---

## 三層架構

### Layer 1 — 感知 / 操控原語（CLI）

| 工具          | 安裝                                                                        | 能力                                                                                                       | 結論                                                                 |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **AXe** ✅    | `brew install cameroncooke/axe/axe`                                         | `describe-ui`（含 bounds 的 a11y tree）、`tap`（座標或 `--label`）、`type`、`key`、`key-sequence`、`key-combo`（如 Cmd+V）、`swipe`、`screenshot`、`list-simulators` | 主動維護（v1.7.1, 2026-06）。**首選**，與 idb 同底層私有 CoreSimulator HID+a11y API |
| **idb**（備援）| `brew tap facebook/fb; brew install idb-companion; pipx install fb-idb`     | `idb ui tap/swipe/text/key`、`describe-all`、`screenshot`（能力面與 AXe 相當）                              | 維護停滯（最後 release v1.1.8, 2022-08），Xcode 升級後易壞。**只在 AXe 不夠時才用** |
| **xcrun simctl** | 隨 Xcode                                                                 | 僅生命週期 / 設定：`boot`、`launch`、`openurl`（deep link）、`addmedia`、`push`、隱私授權、`status_bar`、`ui appearance`、`io screenshot/recordVideo`、`pbcopy/pbpaste` | **確認沒有** tap/type/swipe/手勢指令 → 這就是為何需要 AXe/idb       |

### Layer 2 — 讓 Claude Code 以 MCP tool 呼叫

| 工具                   | 安裝                                            | 暴露的 tool                                                                                          | 何時選                                                       |
| ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **ios-simulator-mcp** ✅ | `claude mcp add ios-simulator -- npx -y ios-simulator-mcp` | `ui_tap`、`ui_type`、`ui_swipe`、`ui_describe_all`、`ui_describe_point`、`find_element`、`screenshot`、`ui_view`、`launch/install`、`get_booted_sim_id` | ~2k★, MIT, v1.6.0(2026-04) 活躍；包 idb（**需先裝 idb**）+ simctl screenshot；**Sim-only**（正好符合被卡的 Apple Developer Program） |
| mobile-next/mobile-mcp | 見官方 repo                                      | 同上類 + `mobile_open_url`（deep link）、`mobile_press_button`                                       | ~5.2k★, Apache-2.0, 跨平台（iOS+Android, sim+device），用 simctl + WDA（自動起在 sim port 8100）。**若日後要 Android / 需 deep-link / 按硬體鍵才選** |

### Layer 3 — E2E 測試框架

| 框架          | 安裝                                                       | 特性                                                                                          | 結論                                                            |
| ------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Maestro** ✅ | `curl -fsSL https://get.maestro.mobile.dev \| bash`（需 Java 17+ 與 Xcode） | Black-box、**免特製 build**（測你已 build 的同一個 .app）、**New-Arch 免疫**（驅動 iOS a11y/XCUITest，不碰 JS bridge）；YAML DSL：`launchApp`/`tapOn`/`inputText`/`assertVisible`/`takeScreenshot`/`runFlow`；自帶 MCP（`claude mcp add maestro -- maestro mcp`）；Expo dev-client + release 皆可、免 config plugin；iOS = **Simulator only**（對我們剛好） | **首選**：最易讓 AI 撰寫 + 迭代                              |
| Detox（Wix）  | 需 `.detoxrc` + native dep + `detox build`                 | New-Arch ≥20.44 支援，但有 Fabric/Bridgeless sync deadlock/NPE 歷史；Expo SDK 54 需社群 config plugin（官方 `@config-plugins/detox` 只 peer `expo ^53`） | 摩擦高，不選                                                    |
| Appium 2/3 + XCUITest | build/install WDA + stateful server + WDIO client | 鍵盤控制最顯式（`forceSimulatorSoftwareKeyboardPresence:true`、`connectHardwareKeyboard:false`），但 setup 最重、無 auto-sync → 對 RN 較 flaky | 不選                                                            |

---

## ⚠️ 關鍵 caveats（最重要，先讀完再動手）

1. **AXe/idb 的 `type` / `ui text` 走 raw HID 鍵盤事件**（Simulator「Indigo」pipeline、**僅 US layout**）。這條路徑等同實體 Mac 鍵盤 → **會打不進「忽略硬體鍵盤事件」的 Fabric TextInput**。→ **絕不**用 AXe/idb type 對 RN TextInput 輸入文字。
2. **能成功輸入文字的兩條路徑**：
   - **(a) Maestro `inputText`** — 走 XCUITest typing，繞開陷阱。
   - **(b) 剪貼簿貼上** — `echo -n "text" | xcrun simctl pbcopy booted`，再用 AXe `key-combo` 送 **Cmd+V**（或用編輯選單貼上）；走 UIKit `insertText`，Fabric 接受。**這就是今天 debug 時手動貼上能成功的原因。**
3. **繁中 / CJK**：HID 僅 US layout → 中文**必須**走 (b) pbcopy+paste。Xcode 26 有剪貼簿同步 bug，貼上前先補一招：`pbpaste | xcrun simctl pbcopy booted`（貼上前即時重打一次剪貼簿）。
4. **給元件加 `testID`（及/或 `accessibilityLabel`）**：Fabric view-flattening 會丟掉沒標記的節點 → a11y tree / 元素匹配才可靠。Detox 的 `by.id` 必需、Maestro/AXe 匹配也更穩。需要被自動化操作的螢幕/元件就補上。
5. **idb ↔ Xcode 版本歪斜是 #1 故障源**：優先 AXe；**每次升 Xcode 後重驗**（`idb list-targets` / `axe list-simulators`）。
6. **與今天的 New-Arch 鍵盤 bug 的關係**：我們已設 `newArchEnabled:false`（`apps/mobile/app.config.ts`），手動打字 bug 暫時消失。**但本計劃的文字輸入策略不依賴這個開關**——即使日後重開 New Arch，**Maestro `inputText`（XCUITest 路徑）仍然可用**，自動化 E2E 不受影響。raw-HID type 則無論如何都別用。

---

## 分階段 rollout（含確切指令）

> 前置：照 `docs/runbook/local-testing.md` 起好 Firebase Emulator（auth 9099 / firestore 8080 / UI 4000）並用 `expo run:ios` build 過 app。測試帳號 `test@assetanchor.dev` / `test1234`。Simulator 用 iPhone 16 Pro。

### Phase 1 — 裝 AXe（idb 備援），Claude Code 立即能看 + 操控

```bash
brew install cameroncooke/axe/axe
axe list-simulators                 # 確認看得到 booted iPhone 16 Pro
axe describe-ui                     # 印出當前畫面 a11y tree（含 bounds）
axe screenshot --output /tmp/aa.png # 截圖；Claude Code 可 Read 這張圖來「看」畫面

# 備援（僅 AXe 不夠時）：
brew tap facebook/fb && brew install idb-companion && pipx install fb-idb
idb list-targets
```

到此 Claude Code 即可透過 **Bash** 呼叫 `axe describe-ui` / `axe tap --label "持倉"` / `axe screenshot` 來感知與操控。**文字輸入照 caveat #2**：

```bash
echo -n "test@assetanchor.dev" | xcrun simctl pbcopy booted
axe tap --label "Email"        # 先聚焦目標欄位
axe key-combo cmd v            # 貼上（UIKit insertText，Fabric 接受）
```

### Phase 2 — 接 ios-simulator-mcp（更乾淨的 tool 介面）

```bash
claude mcp add ios-simulator -- npx -y ios-simulator-mcp   # 需先裝好 idb
```

- 之後 Claude Code 直接有 `ui_tap` / `ui_describe_all` / `find_element` / `screenshot` 等 tool，少寫 Bash glue。
- ⚠️ **MCP server 在 session 啟動時載入** → 新增後可能要**重開 session** 才看得到工具。
- ⚠️ 其 `ui_type` 同樣是 idb 底層（raw HID）→ **仍不可**拿來打 RN TextInput；文字輸入照 caveat #2 走剪貼簿，或留給 Phase 3 的 Maestro。

### Phase 3 — 裝 Maestro，寫關鍵旅程的 E2E flow

```bash
curl -fsSL https://get.maestro.mobile.dev | bash      # 需 Java 17+ 與 Xcode
maestro --version
claude mcp add maestro -- maestro mcp                  # （選用）讓 Claude Code 直接驅動 Maestro
```

要寫的 3 條關鍵旅程（建議放 `apps/mobile/.maestro/`）：

| Flow                       | 路徑                                              | 文字輸入策略                                        |
| -------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| (a) Email/密碼登入         | 登入後落在 **持倉** tab                            | email/密碼是 ASCII → **`inputText`**                |
| (b) 新增帳戶               | 設定 → 帳戶管理 → FAB                              | 帳戶名稱含繁中 → **pbcopy + paste**（caveat #3）    |
| (c) 新增一筆 BUY 交易      | **交易** tab FAB                                  | 數字 ASCII 用 `inputText`；含中文欄位走剪貼簿       |

撰寫要點：

- ASCII 文字用 `inputText`；**繁中欄位**先 `echo -n "中文" | xcrun simctl pbcopy booted`（或 `pbpaste | xcrun simctl pbcopy booted` 防 Xcode 26 同步 bug），再以 `tapOn` 聚焦欄位 + 貼上。
- 元素匹配用 `id`（對應元件 `testID`）優先，文字 label 次之。**先補 testID** 到上述三條旅程會碰到的螢幕/元件（caveat #4）。
- 每步 `takeScreenshot`，Claude Code 可 Read 來核對；驗收用 `assertVisible`（如登入後 `assertVisible: 持倉`）。
- 跑單一 flow：`maestro test apps/mobile/.maestro/login.yaml`。

最小範例（登入）：

```yaml
appId: com.assetanchor.mobile      # 以 app.config.ts 實際 bundle id 為準
---
- launchApp
- tapOn: { id: "signin-email" }
- inputText: "test@assetanchor.dev"
- tapOn: { id: "signin-password" }
- inputText: "test1234"
- tapOn: { id: "signin-submit" }
- assertVisible: "持倉"
- takeScreenshot: after-login
```

### Phase 4（選用）— 接進本地 pre-merge 檢查

- 把 Maestro flow 串成本地 merge 前的 smoke check（**非 CI**，除非有 macOS runner）。
- 記錄現況：**CI（`.github/workflows/ci.yml`）目前只跑 `@assetanchor/shared` 的 `test:coverage`**；mobile/firebase 測試本機手動跑。Maestro E2E 同理屬本機 gate，不進 CI（無 macOS runner）。

---

## Sources

- ios-simulator-mcp: https://github.com/joshuayoes/ios-simulator-mcp
- mobile-mcp: https://github.com/mobile-next/mobile-mcp
- AXe: https://github.com/cameroncooke/AXe ｜ https://www.axe-cli.com/docs/keyboard-input
- idb: https://github.com/facebook/idb ｜ https://fbidb.io/docs/commands/
- Maestro: https://docs.maestro.dev ｜ https://docs.maestro.dev/get-started/maestro-mcp ｜ https://github.com/mobile-dev-inc/maestro/issues/2202（New-Arch）｜ https://maestro.dev/blog/running-maestro-ui-tests-in-an-expo-development-builds
- Detox: https://wix.github.io/Detox/docs/articles/how-detox-works/ ｜ https://www.npmjs.com/package/@config-plugins/detox
- Appium XCUITest: https://appium.github.io/appium-xcuitest-driver/latest/reference/capabilities/
- RN/Fabric 鍵盤 bug: https://github.com/facebook/react-native/issues/45297 ｜ https://github.com/facebook/react-native/issues/32844 ｜ https://github.com/expo/expo/issues/31505

---

## 相關文件

- 本地測試 / Emulator 起法：`docs/runbook/local-testing.md`
- 視覺驗收（手動逐畫面對圖）：`docs/runbook/visual-acceptance-align-to-design.md`
- 設計權威 / 視覺對圖規範：`docs/adr/0008-design-package-as-source-of-truth.md`、`CLAUDE.md`「設計驅動工作流」
- New-Arch 鍵盤 bug 暫解所在：`apps/mobile/app.config.ts`（`newArchEnabled:false`）
