## Why

持倉/交易/個股詳情畫面的資產「名稱」目前來自硬編 demo map（`apps/mobile/src/features/holdings/holdingsDemo.ts` 的 `SYMBOL_META`，僅 ~7 檔；其餘 fallback 成 raw ticker）。`symbols/{symbolId}` collection（planning §6 Collection 5）的 metadata 欄位（`name`/`name_zh`/`exchange`/`industry`/`sector`）**已存在於 schema 與 shared 型別但從未被寫入或讀取**——mobile 對該 collection 零讀寫。這是 Sprint 6（MVP Polish, §13.2）列首的收尾項：讓使用者輸入任一代號都能看到正確公司全名/中文名，並清掉殘留 demo 程式碼。planning §5（596–599）已拍板 MVP 策略：「使用者新增交易時若 symbol 不在 collection 裡，動態建立一筆」＋「長期可由後端 enrich」。

## What Changes

- **shared**：新增 symbol metadata 的 normalize/sanitize 純函式（把外部資料源回傳整形成 `SymbolDocument` 的 metadata 欄位、缺值與異常防禦），TDD、進 coverage gate。**無 schema 變更**——`SymbolDocument` 欄位已齊，本 change 僅 populate。
- **functions**：新增 Yahoo symbol metadata provider + `fetchSymbolMeta` HTTPS endpoint（沿用 Sprint 5b live-quotes 的 **onRequest** 模式，避開 RNFirebase Functions 原生模組），由 Admin SDK upsert 到 `symbols/{symbolId}`（10 位精度規範不適用——metadata 無金額）。
- **mobile**：新增 `services/symbols`——讀 `symbols/{symbolId}`、不存在時依「新增交易」的代號動態 create 一筆（client create，符合既有 rules），並觸發後端 metadata enrich；holdings / transactions / AssetDetail 的名稱顯示改吃 `symbols` 真值，**移除 `holdingsDemo.ts` 的硬編名稱來源**。
- **firebase**：檢視 `symbols/{symbolId}` rules（登入可讀、可 create、不可 update/delete）對「client create 空殼 + 後端 Admin SDK enrich」是否相容；補/調 rules 測試。

## Capabilities

### New Capabilities

- `symbol-metadata`: `symbols/{symbolId}` 文件的生命週期——未知代號動態建立、後端從外部資料源補 metadata、client 讀取顯示權威名稱（取代 demo 名稱來源）。

### Modified Capabilities

<!-- 無：本 change 不改既有 capability 的 spec 級需求。transaction-entry 的交易寫入流程不變（symbol 仍為原 ticker 字串）；holdings-derivation 的純推導（股數/成本）不變；名稱顯示原本未被任何 spec 規範（demo 程式碼），故為全新需求歸入 symbol-metadata。 -->

## Impact

- **新增程式碼**：`packages/shared/src/symbols/*`（純函式 + 測試）、`apps/functions/src/symbols/*`（provider + endpoint）、`apps/mobile/src/services/symbols/*`。
- **修改**：mobile holdings/transactions/AssetDetail 名稱顯示來源；移除/縮減 `holdingsDemo.ts`（名稱部分）。
- **Firestore**：`symbols/{symbolId}` 開始有實際讀寫（先前空置）；rules 既有、可能補測試。**schema 無變更（聖牛不動）**。
- **相依**：無新 npm 相依（Yahoo 走 HTTPS fetch，同 live-quotes）。
- **Gate（不擋 loop）**：functions 的 production `firebase deploy` = 延後部署 gate（owner）；dev 對 emulator 驗證。帶 UI（顯示真名）→ archive 前需 owner iOS Simulator 視覺對圖（ADR-0008），但對圖過了即 archive、續做。

## Non-goals

- **不**做 symbol 自動補完 / 搜尋 picker（planning §3「股票代號自動補完」屬第二階段；本 change 只在「已輸入的代號」上補 metadata）。
- **不**做定時 cron 批次 enrich（§5「長期可做 cron」屬後續）；本 change 為 on-demand（交易建立時觸發 + 缺值時補抓）。
- **不**改 `symbols` schema 欄位、**不**新增 enum、**不**碰 Money/decimal 精度規則。
- **不**做 theme toggle / Sentry / 真機 dogfood（Sprint 6 其餘項，皆觸發人類介入 gate，另案由 owner 決策）。
- **不**處理 holdings row 的「帳戶」真值化（屬對帳 change `complete-reconciliation`）。
