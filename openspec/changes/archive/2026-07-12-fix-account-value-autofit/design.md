## Context

`AccountDetailScreen.tsx` 的 hero「帳戶市值」數字目前：

- 樣式 `styles.heroValue` 用 `fontSize.hero = 38`（Nunito ExtraBold）、`numberOfLines={1}`，無自動縮放。
- 數字字串由元件內 helper 產生（非 `Money.toDisplayString`）：
  ```ts
  const dp = base === 'USD' ? 2 : 0;
  const fmtNum = (n) =>
    n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const fmtBase = (n) => `${currencyPrefix(base)} ${fmtNum(n)}`;
  ```
  → TWD 基礎幣別帳戶顯示 0 位小數。

此為顯示層問題，不涉 `Money` 精度（ADR-0005）或 Firestore schema。屬 owner dogfood 要求的 MVP polish。

## Goals / Non-Goals

**Goals:**

- hero 主數字自動縮放字級，長金額完整單行、不截斷。
- hero 主數字一律顯示到小數點第二位（含 TWD）。
- 最小侵入：只動 hero 主數字的 `<Text>` props、`styles.heroValue`、hero 專用 `fmtNum` 的 `dp`。

**Non-Goals:**

- 不改任何**字級**（除 hero 主數字加 autofit 外）；拆分小字、成本/未實現、持股列、帳戶列表 row 字級不動。
- 不改持股列（`formatMoney`）、帳戶列表 row 的小數格式（hero 區塊小數一致轉 2 位屬同一 helper 的一致化，見 D2）。
- 不動 `Money`/decimal 儲存與運算精度；不改 schema、報價降級、多幣別換算。
- 不做全站字級/格式統一（若要另開 change）。

## Decisions

### D1：字級自動縮放用 RN 原生 `adjustsFontSizeToFit` + `minimumFontScale`

- **選擇**：hero 數字 `<Text>` 加 `adjustsFontSizeToFit`、保留 `numberOfLines={1}`、設 `minimumFontScale`（例如 `0.5`，即最小可縮到 ~19px，對齊 owner「縮小約 50%」的直覺下限）。基礎 `fontSize.hero` 維持 38（短數字仍大器），長數字由 RN 自動縮。
- **為何**：純原生行為、零依賴、無需量測文字寬度；短數字保持 hero 質感、長數字保證完整。`minimumFontScale` 一併避免縮到不可讀。
- **替代**：(a) 直接固定改小成 ~19px——短數字也變小、hero 失去層級感，且超長金額仍可能溢出；(b) 手動量 `onTextLayout` 動態算字級——複雜、易抖動。皆不如原生 autofit。

### D2：hero 主數字一律 2 位小數

- **選擇**：把 hero 專用 `dp` 從 `base === 'USD' ? 2 : 0` 改為固定 `2`。
- **為何**：對齊 `account-management` spec 既述「UI 出口才 `toDisplayString()`」（`toDisplayString` 恆 2 位）；滿足 owner「至少看到小數點第二位」。
- **範圍**：實查 `fmtBase`/`fmtNum`/`fmtBaseAbs` 全部呼叫點皆在 hero 區塊內（主市值 L239、持股市值/現金 L255/258、投入成本 L264、未實現 L267），持股列另走 `formatMoney`。故直接把 `dp` 改為固定 `2`，整個 hero 區塊一致 2 位小數——比拆 helper 更簡潔、視覺一致，且不外溢至持股列/帳戶列表。
- **替代**：改用 `Money.toDisplayString()`——語意最正但需確認 hero 值來源為 `Money`（目前是 `number`：`holdingsValue + cashBase.toNumber()`）。本 change 維持現有 `number` 顯示路徑、僅調 `dp`，不擴大重構面。

## Risks / Trade-offs

- [autofit 在極長數字縮到 `minimumFontScale` 仍放不下] → `numberOfLines={1}` + 已縮至下限時 RN 會截斷；選 `minimumFontScale` 時以「合理最大帳戶市值（如兆級 TWD 含 2 位小數）在 hero 寬度內可容」為準校準，視覺對圖時確認。
- [共用 helper 誤改到拆分小字/其他數字] → 實作時先確認 `fmtNum`/`fmtBase` 的所有呼叫點，只讓 hero 主數字走 2 位；其餘維持原行為（加測試或視覺對圖把關）。
- [autofit 造成同頁多帳戶字級不一致的觀感] → hero 為單一數字、非清單，觀感可接受；短數字仍同基礎字級。

## Migration Plan

無資料/schema 遷移。純顯示層改動，改壞可即時 revert commit。發布走既有 GitHub Flow（main 恆可發布，定期切 TestFlight）。

## Open Questions

- `minimumFontScale` 的確切值（0.5 vs 0.55）留待視覺對圖時依實機 hero 寬度微調，不阻塞實作。
