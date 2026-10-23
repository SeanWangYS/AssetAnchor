## Why

Firestore rules 目前只檢查「是不是本人」：`users/{uid}/**` 本人可寫任何欄位、任何值、任何 subcollection，`symbols` 任何登入者可建立任意內容。App Check 只擋非正版 App，擋不住已登入使用者（或拿到其 token 的人）直接用 SDK 寫入格式錯誤的資料——例如 `quantity` 寫成 number、幣別寫成 `JPY`、自稱 MCP 匯入，這類資料會讓 `deriveHoldings`／Money 在讀取端 fail-loud。

## What Changes

- `firestore.rules` 加入逐欄驗證：`users/{uid}`、`accounts`、`transactions` 的 create 驗完整欄位集（`hasOnly` + `hasAll`）、型別、enum、10 位小數金額格式、日期格式、長度上限、`serverTimestamp`；update 只允許改可編輯欄位（`affectedKeys().hasOnly`）並驗結果值。
- `users/{uid}` 下只允許寫 user doc、`accounts`、`transactions`；accounts 與 user doc 不可刪。
- **BREAKING（僅對 client 直寫）**：`symbols` 改為 client 不可寫——App 從未寫入，只由後端 `fetchSymbolMeta`／MCP 工具（Admin SDK）建立。
- client 不可寫入或修改 `source`／`import_batch_id`（MCP 匯入專用）。
- shared zod 加上與 rules 一致的長度上限：帳戶名稱 100、備註 1000、代號 32（表單能顯示訊息，而非寫入被默默拒絕）。
- rules 測試改用 shared `buildTransactionDoc` 產生交易 payload，並逐一驗證 shared enum 值都被接受。

## Capabilities

### New Capabilities

- `firestore-write-validation`：client 對 Firestore 寫入的欄位級驗證。

### Modified Capabilities

- `symbol-metadata`：`symbols` 存取規則改為 client 不可寫。

## Impact

- `firebase/firestore.rules`、`firebase/tests/firestore.rules.test.ts`、`firebase/jest.config.ts`
- `packages/shared/src/schemas/account.ts`、`transaction.ts`（+ 測試）
- 文件：planning §7、CLAUDE.md 架構速覽、symbol-metadata spec
- 部署：`firebase deploy --only firestore:rules`（owner）。不需要新 App build。
- 無 schema 變更（不新增／移除欄位），只把既有 schema 寫進 rules。
