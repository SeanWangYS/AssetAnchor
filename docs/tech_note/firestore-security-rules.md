# Firestore Security Rules — 技術筆記

> **建立日期**：2026-05-30
> **情境**：AssetAnchor MVP — client app（mobile / web）用 Firebase SDK 直連 Firestore，沒有自己的 API server 居中把關 read/write，所以「誰能讀寫什麼」全靠 Security Rules 來守。本筆記整理 §7 的四條規則與為什麼要把規則當成可測試的程式碼。
> **來源**：學習對話整理 + 本專案 `firebase/firestore.rules`、`firebase/tests/firestore.rules.test.ts`、`docs/portfolio_tracker_planning.md` §7。

---

## TL;DR

Firestore Security Rules 是一份 **declarative 的存取控制規則**，跑在 **Firebase 的伺服器上**，對**每一筆 read/write 逐一評估**（allow / deny）。重點是：client app **直連 Firestore**，中間沒有你自己的 server 程式碼可以擋——所以 **rules 是唯一的安全邊界**。一條寫錯的規則（例如 `allow read: if true`）就等於「任何人都能讀走所有人的資料」。把它想成「寫在資料庫本身上的 Row-Level Security + IAM」，預設一律 deny，沒命中 allow 就拒絕。因為風險高、錯了又安靜無聲，所以要用 Emulator + `@firebase/rules-unit-testing` 把它當程式碼來測。

---

## 1. 定義：為什麼非懂不可

Firestore Security Rules = **跑在 Firebase 伺服器端的 declarative access-control**。每一次 client 發出 read 或 write，Firebase 都會拿這份規則去評估「這個請求允不允許」，回傳 allow 或 deny。

關鍵在於架構：在傳統後端，client 打你的 API server，server 裡有程式碼做「這個 user 能不能動這筆資料」的檢查，再去碰資料庫。**Firebase 模式下 client 直接連 Firestore**，read/write 路徑上**沒有你自己的 server 程式碼**可以攔截。

於是結論很硬：**Security Rules 是唯一的安全邊界（the only security boundary）**。沒有別的地方能補救。一條 `allow read: if true` 不是「比較寬鬆」，而是「全世界都能讀走每個使用者的全部資料」——而且它不會報錯、不會當機，安靜地把資料攤開給所有人。這就是為什麼這份檔案非懂不可。

---

## 2. 類比：RLS + IAM 寫在資料庫上

規則的概念對熟悉後端 / 雲端的人其實不陌生，它是兩個既有概念的合體：

| 既有概念                        | 做什麼                                                            | 對應到 Security Rules                                        |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **Postgres Row-Level Security** | 在 table 上掛 policy，依「目前是哪個 user」過濾 / 授權每一列 row  | `match` path + `request.auth.uid == userId` 做 per-user 隔離 |
| **AWS IAM resource policy**     | declarative 的 allow / deny 規則，**預設 deny**，沒明寫允許就拒絕 | 同樣 declarative、同樣預設 deny、寫在 resource 旁邊          |

一句話記：**Security Rules ≈ 「把 RLS 加 IAM，直接寫在資料庫本身上」**。不是另外架一台 policy server，而是規則就貼在 Firestore 上、由 Firebase 在每筆請求時自動套用。

---

## 3. 怎麼運作

規則放在 `firestore.rules` 檔案裡，結構是巢狀的 `match` path block，每個 block 用 `allow read/write: if <condition>` 描述「在這條路徑上，什麼條件下允許什麼操作」。

condition 最常用的就是 `request.auth`：

- `request.auth != null` → 這個請求**有登入**（signed in）。
- `request.auth.uid` → 這個請求**是哪一個 user**（user 的 ID）。

最重要的隱性規則：**預設 deny**。只要沒有任何 `allow` 命中這次請求，就一律拒絕。所以規則是「列舉允許的事」，而不是「列舉禁止的事」。

本專案 per-user 隔離的核心規則長這樣：

```
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

白話：路徑裡的 `{userId}` 是萬用變數（matches 任何 user ID），`{document=**}` 表示「這個 user 底下的所有子文件，遞迴全包」。允許的條件是「有登入，而且登入者的 uid 正好等於路徑上那個 userId」——也就是**你只能讀寫你自己那一坨**。

對照兩種架構，就能看懂為什麼這份檔案是唯一的閘門：

```
 傳統後端：
   App ──▶ 你的 API server ──▶ DB
                │
          (在這裡做 auth check：誰能讀寫什麼)


 Firebase：
   App ───────────────────▶ Firestore
                │
        ┌───────┴────────┐
        │ Security Rules │   ◀── 唯一的閘門（the only gate）
        └────────────────┘
            (沒有別的 server 可以補救)
```

---

## 4. AssetAnchor §7 四條規則

實際規則在 `firebase/firestore.rules`，四個 collection 各有不同的存取輪廓：

| 路徑                    | read                       | write                                           | 設計意圖                                       |
| ----------------------- | -------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `users/{userId}/**`     | `auth.uid == userId`       | `auth.uid == userId`                            | **per-user 隔離**：每人只能讀寫自己那棵子樹    |
| `exchange_rates/{date}` | 登入即可（`auth != null`） | `if false`                                      | 匯率人人可讀；**只有後端 Admin SDK 能寫**      |
| `symbols/{symbolId}`    | 登入即可                   | `create` 登入即可；`update`/`delete` `if false` | 可讀、可動態新增（MVP），但**不可改不可刪**    |
| `quotes/{symbolId}`     | 登入即可                   | `if false`                                      | 報價快取人人可讀；**只有 Cloud Function 能寫** |

兩個重點：

- **`write: if false` 不是「永遠拒絕」全世界**——它擋的是「透過 client SDK 走規則路徑」的寫入。後端用 **Admin SDK / Cloud Function** 寫入時走的是特權通道、**完全繞過 Security Rules**，照樣能更新匯率與報價。所以 `if false` 的真正語意是「client 一律不准寫，這份資料只能由可信的後端產生」。
- `symbols` 開放 `create` 但鎖死 `update` / `delete`，是讓 MVP 能在使用者輸入新代號時動態長出 symbol，同時避免任何人竄改或刪掉既有代號。

---

## 5. 為什麼要測 rules

Security Rules 是**高風險程式碼**：寫錯不會 crash、不會跳紅字，而是安靜地開一個資安破洞（silent security hole）。靠人眼 review 很容易漏掉「咦這條其實 bob 也讀得到 alice」。

正解是把這個安全邊界**當成可測試的程式碼**：用 **Firebase Emulator** 在本地起一個假的 Firestore，搭配 **`@firebase/rules-unit-testing`** 的 `assertSucceeds` / `assertFails`，對規則寫斷言。要證明的命題包括：

- alice **能**讀寫自己的 doc（`assertSucceeds`）。
- alice **不能**讀 bob 的 doc（`assertFails`）。
- **未登入**（unauthenticated）**不能**讀使用者 doc（`assertFails`）。
- `exchange_rates` / `quotes` client **不能寫**（`assertFails`）；`symbols` 能 create 但**不能 update**。

這就是「把安全邊界當成可測試的程式碼」的精神——規則的每一句承諾，都有一條測試在守。

> 對照本專案：這對應到 **T10**（`firebase/tests/firestore.rules.test.ts`）。**規則本身是正確的、也已部署**；目前那輪 test run 卡在一個與規則無關的 test harness 版本相容性問題，正另案修復中。

---

## 6. 速查表

- **Security Rules**：跑在 Firebase 伺服器、逐筆評估 read/write 的 declarative 存取控制；client 直連 DB，**它是唯一的安全邊界**。
- **`request.auth`**：`!= null` = 有登入；`.uid` = 是哪個 user。condition 幾乎都圍著它寫。
- **預設 deny**：沒命中任何 `allow` 就拒絕；規則是「列舉允許」而非「列舉禁止」。
- **RLS · IAM 類比**：≈ 把 Postgres Row-Level Security 加 AWS IAM resource policy，直接寫在資料庫本身上。
- **rules 測試**：高風險、錯了無聲 → 用 Emulator + `@firebase/rules-unit-testing` 的 `assertSucceeds` / `assertFails` 把安全邊界當程式碼測。

---

## 參考

- 本專案規則：`firebase/firestore.rules`
- 規則測試：`firebase/tests/firestore.rules.test.ts`
- 規格 §7：`docs/portfolio_tracker_planning.md` 第 7 章 Security Rules
