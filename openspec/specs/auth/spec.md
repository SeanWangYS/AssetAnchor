# auth Specification

## Purpose

管理使用者身分：Email/密碼與 Google 登入、註冊、登出、密碼重設，以及登入狀態驅動的導航切換與使用者資料隔離。對應 Sprint 1（Auth + Hello Firebase Rail）已建成的行為。

> 來源：docs/portfolio_tracker_planning.md §3（帳號系統）、§11（導航）；
> 實作紀錄：docs/runbook/sprint-1-status.md。

## Requirements

### Requirement: Email/密碼註冊

系統 SHALL 允許使用者以 Email + 密碼透過 Firebase Auth 建立帳號，註冊成功後自動進入已登入狀態。

#### Scenario: 註冊成功

- **WHEN** 使用者在 SignUp 畫面輸入有效的 Email 與密碼並送出
- **THEN** 建立 Firebase Auth 帳號，使用者自動登入並進入 MainTabs

#### Scenario: 註冊失敗顯示繁中錯誤訊息

- **WHEN** 註冊失敗（如 email 已存在、密碼強度不足、網路錯誤）
- **THEN** 依 authErrors 對照表顯示對應的繁體中文錯誤訊息，不顯示原始 Firebase error code

### Requirement: 註冊時建立使用者文件（Firestore rail）

系統 SHALL 在註冊成功時於 Firestore `users/{uid}` 建立使用者文件，document id 與文件內 `uid` 欄位均等於 Firebase Auth uid。

#### Scenario: 首次註冊建立 user document

- **WHEN** 使用者完成註冊
- **THEN** Firestore `users/{uid}` 文件被建立，且 Auth uid、document id、`uid` 欄位三方一致

### Requirement: Email/密碼登入與登出

系統 SHALL 允許既有使用者以 Email + 密碼登入，並可隨時登出。

#### Scenario: 登入成功

- **WHEN** 使用者在 SignIn 畫面輸入正確的 Email 與密碼
- **THEN** 進入已登入狀態並顯示 MainTabs

#### Scenario: 登入失敗

- **WHEN** 使用者輸入錯誤的帳號或密碼
- **THEN** 顯示繁體中文錯誤訊息並停留在 SignIn 畫面

#### Scenario: 登出

- **WHEN** 已登入使用者執行登出
- **THEN** 回到未登入狀態並顯示 SignIn 畫面

### Requirement: 忘記密碼

系統 SHALL 提供 ForgotPassword 畫面，讓使用者輸入 Email 後寄送 Firebase Auth 密碼重設信。

#### Scenario: 寄送重設信

- **WHEN** 使用者在 ForgotPassword 畫面輸入已註冊的 Email 並送出
- **THEN** 系統透過 Firebase Auth 寄送密碼重設信並顯示成功提示

### Requirement: Google 登入

系統 SHALL 支援 Google Sign-In（@react-native-firebase + signInWithCredential），登入後行為與 Email 登入一致。

> 註：code 已完成（commit 75ca15d），runtime 驗證待真機（Sprint 1 T9，Simulator 受限）。

#### Scenario: Google 登入成功

- **WHEN** 使用者在 SignIn 畫面點選 Google 登入並完成 Google 授權
- **THEN** 以 signInWithCredential 建立/登入 Firebase Auth 帳號並進入 MainTabs

### Requirement: 登入狀態驅動導航

系統 SHALL 以 conditional render（非 navigate）依登入狀態切換導航樹：未登入顯示 AuthStack、已登入顯示 MainTabs，避免 navigation history 殘留與未授權畫面閃現。

#### Scenario: 未登入落地

- **WHEN** App 啟動且無已登入使用者
- **THEN** 顯示 AuthStack，落地頁為 SignIn

#### Scenario: 已登入落地

- **WHEN** App 啟動且存在已登入使用者
- **THEN** 顯示 MainTabs，落地頁為持倉 tab（HoldingsOverview）

### Requirement: 使用者資料隔離

Firestore security rules SHALL 限制 `users/{userId}/**` 僅該使用者本人（`request.auth.uid == userId`）可讀寫；未登入或他人一律拒絕。

#### Scenario: 本人可讀寫自己的資料

- **WHEN** 已登入使用者 A 讀寫 `users/{A}` 及其 subcollections
- **THEN** rules 放行

#### Scenario: 他人資料拒絕存取

- **WHEN** 已登入使用者 A 嘗試讀寫 `users/{B}`（B ≠ A）
- **THEN** rules 拒絕
