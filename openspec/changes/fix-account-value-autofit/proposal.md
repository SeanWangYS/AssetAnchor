## Why

帳戶詳情頁（AccountDetail）的「帳戶市值」hero 數字目前有兩個顯示層問題：

1. **字體固定 38px 過大 + 單行**：`AccountDetailScreen.tsx` 用 `fontSize.hero = 38`（Nunito ExtraBold）、`numberOfLines={1}`。大金額（如上百萬 TWD、含小數）一眼看不完整、且可能被截斷，違反 hero 應「一次看清實際數字」的目的。
2. **TWD 帳戶看不到小數**：hero 用元件內的 `fmtNum`，`dp = base === 'USD' ? 2 : 0`——TWD 基礎幣別帳戶顯示 0 位小數（如 `NT$ 1,234,567`），使用者看不到小數點第二位。此與 `account-management` spec 既有敘述「UI 出口才 `toDisplayString()`」（`toDisplayString` 恆 2 位小數）產生 drift。

兩者皆為顯示層缺陷，不涉 Money 精度或 schema；owner dogfood 時明確要求修正，屬 MVP polish。

## What Changes

- 帳戶詳情 hero 的「帳戶市值」數字改為 **`adjustsFontSizeToFit` + `minimumFontScale` 自動縮放**：保留較大的基礎字級，數字越長字體自動縮小，讓完整數字永遠一行呈現、極長金額不被截斷。
- 帳戶市值數字 **一律顯示到小數點第二位**（含 TWD，如 `NT$ 1,234,567.89`），對齊 spec 的 `toDisplayString` 語意；修正 hero 專用 `fmtNum` 的 `dp` 邏輯。因 `fmtBase`/`fmtNum` 為 **hero 區塊專用 helper**（主市值 + 拆分小字「持股市值 · 現金」+「投入成本 · 未實現」皆共用），將其 `dp` 由 `USD?2:0` 改為固定 `2`，讓整個 hero 區塊的基礎幣別金額**一致**顯示 2 位小數（更簡潔、視覺一致）。
- 字級自動縮放僅套用於 hero **主數字**；持股列（另用 `formatMoney`）、帳戶列表 row 的格式化與字級維持不變。

## Capabilities

### New Capabilities

<!-- 無新增 capability -->

### Modified Capabilities

- `account-management`: 「帳戶估值以市值呈現」需求的顯示層細化——hero「帳戶市值」數字 SHALL 自動縮放字級以完整單行呈現，且 SHALL 顯示到小數點第二位（含 TWD）。運算精度不變（仍走 `Money`，ADR-0005）。

## Impact

- **Code（僅 mobile 顯示層）**：`apps/mobile/src/features/accounts/screens/AccountDetailScreen.tsx`——hero 數字的 `<Text>` props（`adjustsFontSizeToFit` / `minimumFontScale` / `numberOfLines`）＋ `styles.heroValue`（基礎字級）＋ hero 專用 `fmtNum` 的小數位數。可能微調 `core/theme` 字級常數（若需新增 hero 縮放的 min scale 慣例）。
- **不影響**：Firestore schema（無變更，非聖牛）、`Money`/decimal 精度（ADR-0005 護欄不動，僅顯示層小數位）、functions、shared 純函式、其他畫面。
- **測試/驗收**：帶 UI → 依 ADR-0008 需逐畫面 iOS Simulator 視覺對圖（DoD）；hero 數字的顯示格式化若抽為純函式可加輕量單元測試。**owner 本人 merge**（UI 視覺保真，GitHub Flow 高風險分級）。

## Non-goals

- **不改** 持股列（`formatMoney`）、帳戶列表 row 的字級或小數格式（本 change 只動 hero 區塊；若要全站統一另開 change）。hero 拆分小字/成本連帶轉 2 位小數屬同一 helper 的一致化，非額外 scope。字級自動縮放**只**套 hero 主數字。
- **不動** Money/decimal 儲存與運算精度（ADR-0005）；Firestore 一律維持 10 位 canonical string，本 change 僅顯示層 2 位小數。
- **不改** schema、報價/降級邏輯、多幣別換算規則。
- **不做** i18n（MVP 純繁中）、不引入第二/三階段功能。
