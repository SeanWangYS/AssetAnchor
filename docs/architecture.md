# AssetAnchor 架構總覽（Top-view）

> **本圖為導覽，權威仍是 code。** 目的是讓 LLM 與人類工程師一眼掌握元件、資料流與信任邊界，好評估新功能落在哪一層。細節以 `apps/`、`packages/shared/src/`、`apps/functions/src/`、`firebase/firestore.rules` 為準；衝突時以 code 為準並回頭修本圖。
>
> 相關權威文件：`docs/portfolio_tracker_planning.md`（§6 schema 聖牛）、ADR-0004（event-sourcing schema）、ADR-0005（單幣別事件＋顯示換算）、ADR-0006（報價雙層 cache）、ADR-0010（走勢圖歷史架構）、CLAUDE.md（憲法 + DoD）。

## 圖一：元件拓樸（前後端 / DB / cache / auth / external / dev）

```mermaid
flowchart TB
    subgraph Client["📱 apps/mobile (Expo SDK 54 / RN 0.81 / React 19)"]
        direction TB
        Features["features/*<br/>accounts · transactions · holdings<br/>analysis · auth · settings"]
        Core["core/*<br/>navigation (RN Nav v7) · theme · ui"]
        Svcs["services/*<br/>firebase · quotes · history<br/>exchange-rates · symbols<br/>preferences · valuation · monitoring"]
        Stores["Zustand stores ×8<br/>auth · accounts · transactions<br/>quotes · history · exchange-rates<br/>preferences · dateRange"]
        MMKV[("MMKV<br/>on-device 報價快取")]
        Features --> Core
        Features --> Stores
        Stores --> Svcs
        Svcs -->|報價快取| MMKV
    end

    subgraph Shared["📦 packages/shared (@assetanchor/shared, 純函式 / 以 source 消費)"]
        direction LR
        Money["money (Money/decimal.js)"]
        SharedRest["enums · types · schemas(zod)<br/>portfolio · analysis · fx · charts<br/>markets · quotes · history · symbols<br/>transactions · preferences"]
    end

    subgraph Backend["☁️ apps/functions (Firebase Cloud Functions)"]
        direction TB
        FnQuotes["quotes<br/>fetchQuote · fetchQuotes<br/>onSymbolCreatedFetchQuote (trigger)"]
        FnFx["exchangeRates<br/>scheduledUsdRate · seedUsdRate"]
        FnSym["symbols<br/>fetchSymbolMeta"]
        FnHist["history<br/>ensureHistory · fetchIntraday"]
    end

    subgraph Data["🔥 Firestore (assetanchor-832df)"]
        direction TB
        UsersC[("users/{uid}/**<br/>accounts · transactions")]
        SymbolsC[("symbols/{symbolId}")]
        QuotesC[("quotes/{symbolId}")]
        RatesC[("exchange_rates/{date}")]
        HistC[("price_history/{docId}")]
    end

    Auth["🔐 Firebase Auth<br/>Email/Password · Google(規劃中)"]
    Yahoo["🌐 Yahoo Finance<br/>報價 · 匯率 · 歷史 · symbol meta"]
    Sentry["📡 Sentry (monitoring)"]

    subgraph Dev["🛠 本地開發 (Emulator Suite)"]
        direction LR
        EmuAuth["Auth :9099"]
        EmuFs["Firestore :8080"]
        EmuFn["Functions :5001"]
        EmuUI["UI :4000"]
    end

    Client -->|"@react-native-firebase v24 modular"| Auth
    Client -->|"讀自己資料 · 寫 users/** 僅本人"| UsersC
    Client -->|"讀 · create(不可改刪)"| SymbolsC
    Client -->|"只讀"| QuotesC
    Client -->|"只讀"| RatesC
    Client -->|"只讀"| HistC
    Client -.->|callable| FnQuotes
    Client -.->|callable| FnHist
    Client -.->|例外 / crash 回報| Sentry

    Client -. 消費 .-> Shared
    Backend -. bundle 進 lib .-> Shared

    SymbolsC ==>|onCreate 觸發| FnQuotes
    FnQuotes -->|Admin SDK 寫| QuotesC
    FnFx -->|Admin SDK 寫| RatesC
    FnSym -->|Admin SDK upsert| SymbolsC
    FnHist -->|Admin SDK 寫| HistC
    FnQuotes --> Yahoo
    FnFx --> Yahoo
    FnSym --> Yahoo
    FnHist --> Yahoo

    Client -. dev 時連 .-> Dev
```

**信任邊界（Firestore rules，`firebase/firestore.rules`）**：

| 集合                    | client 讀 | client 寫                             | 寫入者                  |
| ----------------------- | --------- | ------------------------------------- | ----------------------- |
| `users/{uid}/**`        | 僅本人    | 僅本人                                | client（per-user 隔離） |
| `symbols/{symbolId}`    | 登入者    | **只能 create**（不可 update/delete） | client + 後端 upsert    |
| `quotes/{symbolId}`     | 登入者    | ❌                                    | **後端 Admin SDK only** |
| `exchange_rates/{date}` | 登入者    | ❌                                    | **後端 Admin SDK only** |
| `price_history/{docId}` | 登入者    | ❌                                    | **後端 Admin SDK only** |

**分層與依賴方向**：`features/* → core | services | packages/shared`；feature 之間不互 import。金額/數量/匯率/成本一律走 `shared` 的 `Money`（decimal.js），Firestore 存 10 位小數 string（ADR-0005）。

## 圖二：報價取得流程（最非直覺、最常出 bug 的 path）

> 為何挑這條：報價牽涉 client→trigger→外部 API→後端寫→client 讀回→快取的長鏈，且對「標的市場/代號」敏感（例：台股 ETF 若 market 存成 US → Yahoo 404 → 前端永遠「報價載入中」）。理解這條就理解了整個非同步真值鏈。

```mermaid
sequenceDiagram
    autonumber
    participant U as 使用者
    participant App as mobile (quotesStore)
    participant FS as Firestore
    participant TG as onSymbolCreatedFetchQuote
    participant Q as fetchQuotes (callable)
    participant Y as Yahoo Finance
    participant M as MMKV cache

    U->>App: 新增交易（帶新 symbol）
    App->>FS: create symbols/{symbolId}
    Note over FS,TG: rules 允許登入者 create symbols
    FS-->>TG: onCreate 觸發（事件驅動發現）
    TG->>Y: 抓首筆報價
    Y-->>TG: quote 資料
    TG->>FS: Admin SDK 寫 quotes/{symbolId}

    App->>M: 開頁先讀本地快取
    alt 快取新鮮 (< TTL)
        M-->>App: 命中 → 立即顯示
    else 快取過期 / miss
        App->>Q: callable fetchQuotes（開頁 N→1 批次）
        Q->>FS: 讀 quotes/{symbolId}
        alt quotes 新鮮
            FS-->>Q: 回快取報價
        else 過期 / 缺
            Q->>Y: 抓最新
            Y-->>Q: quote
            Q->>FS: 寫回 quotes/{symbolId}
        end
        Q-->>App: 回報價
        App->>M: 更新本地快取
    end

    Note over App: 失敗降級：Yahoo 404/429 或無報價<br/>→ 顯示最後已知值 + 標記 stale，不整頁卡「載入中」<br/>（可觀測性靠 functions:log + Sentry）
```

**降級與可觀測性**：報價鏈任一環失敗都不應讓持股頁整頁卡在「報價載入中」；應退回最後已知值並標 stale。client 端錯誤能見度有限，後端問題主要靠 `firebase functions:log` 與 Sentry（見 memory：prod 台股 ETF market=US → Yahoo 404 案例）。
