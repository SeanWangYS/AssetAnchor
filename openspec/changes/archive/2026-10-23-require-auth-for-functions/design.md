## Context

`userHttpFunction`（add-app-check）是 5 支使用者端 HTTP functions 的唯一入口；mobile 端所有呼叫都經 `functionsFetch`（quotesStore、historyStore×2、symbolsStore）。所有呼叫都發生在登入後的畫面。

## Goals / Non-Goals

**Goals:** 每個使用者端請求可驗證到 uid；分階段上線不打斷現有 TestFlight build；本地 emulator 走同一條驗證路徑。

**Non-Goals:** rate limit（backlog，之後以 uid 為 key）；Firestore rules 欄位驗證（另一個 change）；改動 `mcp` 的 OAuth。

## Decisions

- **D1 Header**：`Authorization: Bearer <Firebase ID token>`，標準格式；mobile 以 `getIdToken(currentUser)` 取得（SDK 自動快取與更新，過期前才重新簽發）。
- **D2 Gate 順序**：App Check → ID token。兩者皆通過才進 handler。log 一筆 `auth` 事件 `{ fn, outcome, mode }`，不記 uid 以外的個資；`verified` 時附 `uid` 方便排查。
- **D3 純函式 gate**：`checkIdToken(header, { mode, verify })` → `{ outcome: 'verified'|'missing'|'invalid', allow, uid? }`。monitor 一律 allow；enforce 拒 missing/invalid。`verify` 注入 Admin SDK `getAuth().verifyIdToken`，單元測試以 fake 覆蓋。Bearer 解析不分大小寫、容許多餘空白。`invalid` 時附 `reason`（驗證錯誤碼），方便從 log 判斷是過期、撤銷還是格式錯誤。
- **D4 Emulator 不跳過**：functions emulator 在 auth emulator 一起跑時會設定 `FIREBASE_AUTH_EMULATOR_HOST`，Admin SDK 會接受 emulator 簽的 token，因此本地也走真實驗證（與 App Check 的 `skipped` 不同）。
- **D5 分階段**：本 change 部署 `AUTH_MODE = 'monitor'`；enforce 由後續小 PR 翻轉（runbook 記錄步驟與驗證查詢）。
- **D6 mobile 結構**：`functionsFetch` 從 `appCheck.ts` 移到 `functionsFetch.ts`，組合 App Check token 與 ID token；header 組裝為純函式 `authHeaders(idToken)`（與 `appCheckHeaders` 同模式）。未登入時不帶 header。

## Risks / Trade-offs

- 舊 build（0.2.0 (14)/(15)）不帶 ID token → monitor 期間 log 會出現 `missing`，enforce 前必須換新 build。owner 是唯一使用者，風險可控。
- `getIdToken` 需要網路刷新時增加一次延遲（約每小時一次），可接受。

## Migration Plan

1. merge → owner 部署 functions（monitor）。
2. 下次 TestFlight 發版後安裝、使用，查 log `auth` outcome 皆 `verified`。
3. 小 PR `AUTH_MODE = 'enforce'` → owner merge + 部署 → 煙霧測試（無 token 401）。
   回退：`AUTH_MODE` 改回 `'monitor'` 重新部署。
