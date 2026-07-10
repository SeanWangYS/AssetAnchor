# E2E 測試（Maestro）— 本地 pre-merge gate

用 **Maestro** 在 iOS Simulator 上跑可重跑的黑箱 E2E flow，驗核心 user rail（登入 → 新增帳戶 → 新增 BUY 交易）。這是**本地 gate**（CI 無 macOS runner，不進 CI）。方案脈絡見 `docs/superpowers/plans/ios-simulator-automation-e2e-plan.md` 與可行性報告；工具 spike（2026-07-10）結論 = GO。

## 前置

| 項目                          | 版本 / 值                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| Maestro                       | **2.6.1**（pin；`curl -fsSL https://get.maestro.mobile.dev \| bash`，binary 在 `~/.maestro/bin/maestro`） |
| AXe（ad-hoc 感知/操控，選用） | 1.7.1（`brew install cameroncooke/axe/axe`）                                                              |
| Java                          | 17+（本機 Temurin 26）                                                                                    |
| Simulator                     | iPhone 16（或任一 booted iOS 18.x）                                                                       |
| bundle id                     | `com.seanwangys.assetanchor`                                                                              |

## 跑法

```bash
# 1) 起 Firebase Emulator（帶種子：test@assetanchor.dev / test1234 + 4 帳戶 + 12 交易）
pnpm --filter @assetanchor/firebase emulators        # 或 emulators:fn（含 Functions，報價才有值）

# 2) 起 Metro（emulator 模式）。改過 code / testID 後務必帶 --clear（見下方陷阱）
cd apps/mobile && EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true pnpm start -- --clear

# 3) 預熱 app 到已載入狀態（dev build 首次 cold-start 要抓 Metro bundle ~20s）
xcrun simctl launch booted com.seanwangys.assetanchor

# 4) 跑穩定 gate（3 條；排除 dev-build 時序不穩的迴歸 flow）
export PATH="$HOME/.maestro/bin:$PATH" MAESTRO_CLI_NO_ANALYTICS=1
maestro test apps/mobile/.e2e/ --exclude-tags=devbuild-flaky   # 穩定 gate（3/3）
maestro test apps/mobile/.e2e/add-transaction.yaml             # 單條
# 迴歸 flow（dev-build 間歇失敗，建議 release build 或手動跑；見下）
maestro test apps/mobile/.e2e/regression-quote-not-found.yaml
```

穩定 gate 綠燈輸出：`3/3 Flows Passed`。

## Flows（`apps/mobile/.e2e/`）

| Flow                                 | 覆蓋                                                         | 備註                                                                                                                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login.yaml`                         | Email/密碼登入 → 落「持倉」                                  | 也是 subflow（`runFlow: login.yaml`）；session-aware（已登入自動略過）                                                                                                                                                                   |
| `add-account.yaml`                   | 設定 → 帳戶管理 → FAB → 填表(含 3 pickers) → 建立            | 成功訊號＝回「帳戶管理」清單 + 截圖                                                                                                                                                                                                      |
| `add-transaction.yaml`               | header ＋ → 填 BUY(2330) → 送出 → 清單看到                   | 覆蓋 modal 欄位 testID inputText + picker + 送出 + 讀回                                                                                                                                                                                  |
| `regression-quote-not-found.yaml` ⚠️ | 美股+0050 → 404 → 持倉「查無代號」（守 2026-07-09 prod bug） | **tag `devbuild-flaky`、不進穩定 gate**：TransactionForm 兩連續 picker + #41 幣別聯動 re-render 讓 XCUITest a11y 快照落後 → dev-build 間歇失敗（非 app bug）。此 bug 邏輯已由單元測試守住、行為已 AXe 手動驗證；release build 可望穩定。 |

## 踩過的坑（改 flow 前先讀）

1. **改 code / testID 後 Metro 要 `--clear`**：Metro 會服務 cache 的舊 bundle，cold-start 也抓不到新 testID → 加 `pnpm start -- --clear`。
2. **cold-start 保狀態隔離**：flow 用 `launchApp`（預設 stopApp:true）冷啟乾淨；勿用 `stopApp:false`（modal 狀態會在 run 間洩漏）。
3. **等 bundle 載入**：cold-start 後用 `extendedWaitUntil: { visible: '持倉|登入' }` 等任一畫面出現，再往下（dev build reload ~20s）。
4. **文字輸入**：ASCII 用 Maestro `inputText`（走 XCUITest，New-Arch 免疫）；**絕不**用 AXe/idb raw-HID `type` 打 RN TextInput（會撞 Fabric 鍵盤問題）。CJK 帳戶名 `inputText` 亦可（實測 unicode OK）。
5. **`hideKeyboard` 偶爾失敗**（RN 自訂輸入）：改用 `scrollUntilVisible` 露出底部送出鈕（捲動同時推開鍵盤）。
6. **`clearState: true` 不登出**：RNFirebase session 在 keychain，clearState 清不掉 → 要回登入頁走 設定 → 登出 → 確認。
7. **元素選擇器**：
   - 欄位 / submit：有 `testID`（`signin-*`/`account-*`/`tx-*`）→ 用 `id:`（最穩）。
   - RN bottom-tab（設定）：tab **在** a11y tree 內，但 label 是複合字串 `設定, tab, 4 of 4`（純 `設定` 精確比對不中）→ 用 regex `tapOn: '設定, tab.*'`（不寫死 tab 數）。**勿用盲座標 `point`**：一次性、無等待/重試，login 斷言後 tab bar 尚未 settle 時那一下會被丟掉。正解＝`waitForAnimationToEnd` 先收斂動畫 + 「`帳戶管理` 未現則補點一次」（`runFlow: when: notVisible`）化解殘餘時序抖動（實測補點確會觸發）。
   - picker：三個「請選擇」佔位相同 → 靠欄位 `testID` 開對的 sheet，再點 sheet 內中文 option。
   - **清單「列」**：帳戶/持股列是複合 a11y label，Maestro 文字匹配不到 → 要斷言特定列需為列補 `testID`（後續 instrumentation；目前以「回到清單頁」為成功訊號）。

## 後續（尚未做）

- 帳戶 / 持股**列**補 `testID` → 可直接斷言「建立的那筆」而非只驗回清單。
- `regression-quote-not-found.yaml` 已建（tag `devbuild-flaky`）：待 release build 或 TransactionForm 減少 re-render 後移出 flaky tag、納入穩定 gate。
- 串進 owner 批次 merge 前的本地 checklist（`docs/runbook/testflight-release.md` 或 pre-merge 步驟）。
