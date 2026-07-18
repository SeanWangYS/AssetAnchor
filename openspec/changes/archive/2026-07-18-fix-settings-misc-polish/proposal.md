## Why

視覺稽核最後五項雜項：**P2-5**（含手續費均價未標示且兩頁兩名——AssetDetail「平均成本」vs AssetTransactions「加權均價」，751.068 含費值會被誤讀為純成交均價）；**P3-7**（報價無 as-of 時間戳，持倉頁只有靜態「延遲 15 分鐘」文案，無法判斷資料多舊——AssetDetail 已有「最後更新 HH:mm」實作、持倉頁沒用）；**P3-15**（設定頁「我的帳號」vs「帳戶」一字之差指涉不同實體；「現金餘額」資訊列混在導航分組無合計語意；「個人資料」放「偏好」語意不精確）；**P3-16**（Profile 唯讀 email 與可編輯欄位同樣式；「儲存鈕無 dirty-state」——程式碼已有 `canSave` dirty 判斷，屬視覺不明顯/稽核誤報，需查證）；**P3-17**（About 版本 hardcode 0.0.1 落後 0.0.2；描述漏 crypto；缺隱私政策入口）。

## What Changes

- **P2-5**（owner 拍板）：兩頁統一名稱「**均價（含費）**」（AssetDetail 我的持倉 row + AssetTransactions 摘要卡）——含費是 deriveHoldings 既定口徑（總成本含費÷股數），標示後不再被誤讀。
- **P3-7**：持倉頁報價註腳改動態 as-of——取用中報價最新 `fetchedAtMs` 產「最後更新 HH:mm」（AssetDetail 既有手法），無報價時退回原靜態文案。
- **P3-15**（owner 拍板，最小改）：「我的帳號」→「**登入帳號**」（與券商「帳戶」區隔）；「現金餘額」→「**現金餘額（合計）**」（補合計語意）；「偏好」group 改名「**帳號**」（該 group 現僅剩「個人資料」一列，與「登入帳號」同族——單名最乾淨；個人資料不移位）。水平 inset 系統化 → **不做**（backlog）。
- **P3-16**：`Input` 元件 `editable=false` 時加 disabled 視覺（淡文字 + 無邊框強調）；儲存鈕 dirty-state **查證後標記**——程式已有（`canSave` 需值變更才 enable），視覺對圖確認 disabled 樣式可辨識即收案（若不可辨識則屬 Button disabled 樣式問題一併補）。
- **P3-17**：版本改**單一來源**——`apps/mobile/package.json` 升 0.0.2（同步既發布版本）、`app.config.ts` 與 AboutScreen 皆讀之（owner 拍板：版號來源搬家；不再手寫兩份）；描述補加密貨幣；**隱私政策入口不做**（無 URL——上架準備時 owner 提供，owner-hold 列總結報告）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `currency-display`：含費均價 SHALL 標示「（含費）」且兩頁同名。
- `live-quotes`：報價註腳 SHALL 顯示動態最後更新時間（有報價時）。
- `user-preferences`：設定頁帳號/帳戶用語 SHALL 可區分；唯讀欄位 SHALL 有可辨識的 disabled 樣式；About 版本 SHALL 與發布版本單一來源。

## Impact

- **apps/mobile**：AssetDetailScreen、AssetTransactionsScreen（標籤）、HoldingsOverviewScreen（as-of 註腳）、SettingsScreen（用語/分組）、core/ui/Input.tsx（disabled 樣式）、AboutScreen + app.config.ts + package.json（版本單一來源 + 描述）。
- **packages/shared**：新增 `formatDisplayTime`（HH:mm，TDD）。**docs/design**：`holdings-overview-spec.md`「平均成本」字面同步為「均價（含費）」（設計包編輯——原型/spec 用「平均成本」，改字＝偏離最高權威，owner 拍板 + spec 加註慣例）。**不影響**：schema、functions、rules。
- **owner gate**：帶 UI → 視覺對圖 + owner merge。**Stacked on PR #64**（真依據：#61-63 動過 AssetDetail/HoldingsOverview/AssetTransactions，#64 為線性 stack tip；SettingsScreen 無人動過）。owner 拍板：①「均價（含費）」名稱②設定頁三處用語③版本單一來源（package.json 0.0.1→0.0.2 同步既發版本——非新發版）。

## Non-goals

- 不做隱私政策入口（無 URL；owner-hold → 總結報告 + backlog）。
- 不做設定頁 inset 系統化（backlog）。
- 不引 expo-constants 直接依賴（其原生 pod 已隨 expo 內建、非重 build 問題——稽核更正；package.json import 更直接、少一層 runtime 取值）。
- 不動 Profile 儲存邏輯（dirty-state 已存在）。
