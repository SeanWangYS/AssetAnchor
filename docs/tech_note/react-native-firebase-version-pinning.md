# React Native Firebase × Firebase JS SDK 版本對齊 — 技術筆記

> **建立**：2026-06-16（內容自 Sprint 1 runbook 救援，根因 2026-06-03 定案）
> **適用版本**：`@react-native-firebase` v24（內建 pin `firebase@12.10.0`）
> **情境**：AssetAnchor Sprint 1 T10 — Firestore rules 測試一直跑不起來，誤以為是 test harness 版本不相容，最後查出真根因是 **Firebase JS SDK 同時存在兩個版本** 造成 `@firebase/firestore` brand check 炸掉。
> ⚠️ **這是會在每次 RNFB 升級時復發的地雷**，升級前務必對齊 pin。

---

## TL;DR

`@react-native-firebase` 內部會**精確 pin**一個 Firebase JS SDK 版本（v24 → `firebase@12.10.0`）。如果 monorepo 裡的 `firebase` workspace 用了**不同**版本（當時是 `^12.14.0`），hoisted 安裝模式會實體複製出**多份** `@firebase/firestore`。`@firebase/firestore` 內部有 **brand check**（用 instance 的「品牌標記」確認物件出自同一份模組），跨版本的兩份模組互相不認得 → 直接 crash。

**修法**：把 `firebase` workspace 的依賴 pin 成**與 RNFB 內建完全相同的精確版本**（`"firebase": "12.10.0"`，不要 `^`），重裝即解。

---

## 1. 根因：兩份 `@firebase/firestore` 撞 brand check

- `@react-native-firebase@24` 在自己的 `package.json` 把 `firebase` 精確鎖在 `12.10.0`。
- `firebase` workspace（`@assetanchor/firebase`，跑 rules 測試）原本宣告 `firebase: "^12.14.0"`。
- 兩者語意不重疊（`12.10.0` ≠ `^12.14.0` 解出的最新），在 **hoisted** node-linker 模式下，pnpm 沒辦法用單一份滿足兩邊 → **實體複製出多份** `@firebase/firestore`。
- `@firebase/firestore` 用 **brand check** 驗證傳進來的物件確實出自「同一份」模組實例。當測試碼拿到的 `Firestore` instance 來自 A 份、而被呼叫的函式期望 B 份時，品牌標記對不上 → **拋錯 / crash**。

> 教訓：症狀（rules 測試跑不起來）看起來像「test harness 不相容」，實際是**依賴圖裡有兩份同名模組**。遇到 `@firebase/*` 的 brand / instance 相關錯誤，先查 `pnpm why firebase` 看是不是有多版本。

---

## 2. 修法：pin 對齊 RNFB 內建版本

`firebase` workspace 改成與 RNFB 內建完全一致的**精確**版本（不用 caret）：

```jsonc
// firebase/package.json
{
  "dependencies": {
    "firebase": "12.10.0", // 對齊 @react-native-firebase@24 內建 pin；勿用 ^
  },
}
```

重裝後 pnpm 只會留一份 `@firebase/firestore`，brand check 通過，rules 測試恢復正常（Sprint 1：7/7 pass）。

---

## 3. ⚠️ 升級地雷（每次 RNFB 升級必檢查）

**未來升 `@react-native-firebase`，若新版 bump 了它內建的 `firebase` pin，`firebase` workspace 的 pin 必須跟著對齊，否則同樣的雙版本 brand-check 錯誤會復發。**

升級 SOP：

1. 升 `@react-native-firebase` 後，查它新版內建 pin 的 `firebase` 版本（看 RNFB 的 `package.json` 或 lockfile）。
2. 把 `firebase` workspace 的 `firebase` 依賴 pin 成**完全相同**的精確版本。
3. 重裝後跑 `pnpm why firebase` 確認**只有一份**；再跑 `pnpm --filter @assetanchor/firebase test:rules` 驗證。

---

## 4. 速查表

- RNFB 精確 pin 一個 `firebase` JS SDK 版本（v24 → `12.10.0`）。
- `firebase` workspace 必須用**同一個精確版本**，否則 hoisted 下複製出多份 `@firebase/firestore` → brand check crash。
- 症狀像「test harness 不相容」，真相是「依賴圖有兩份同名模組」；用 `pnpm why firebase` 抓多版本。
- **每次 RNFB 升級都要重新對齊這個 pin**。

---

## 參考

- `firebase/package.json`（`firebase` 依賴 pin）
- `firebase/tests/firestore.rules.test.ts`（受影響的 rules 測試）
- 相鄰筆記：`docs/tech_note/firestore-security-rules.md`、`docs/tech_note/expo-pnpm-monorepo-integration.md`（`node-linker=hoisted` 的由來）
- 歷史紀錄：`docs/retros/sprint-1.md`
