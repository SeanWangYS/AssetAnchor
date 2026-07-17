## ADDED Requirements

### Requirement: 錯誤呈現不位移且文案對齊 spec

登入錯誤橫幅的出現/消失 SHALL NOT 使表單欄位位移；auth 錯誤文案 SHALL 為繁中且對齊設計 spec 措辭（帳密錯誤 SHALL 為「電子郵件或密碼錯誤，請再試一次。」且 SHALL NOT 洩漏帳號存在性）；email 欄位 SHALL 關閉自動修正與拼字檢查。

#### Scenario: 錯誤橫幅不推表單

- **WHEN** 使用者以錯誤密碼登入
- **THEN** 橫幅 SHALL 顯示且表單欄位 SHALL 維持原位

### Requirement: Demo 入口僅限開發 build

「略過登入」Demo 入口 SHALL 僅在開發 build 存在；release/TestFlight build SHALL NOT 顯示（spec 明定正式版移除）。

#### Scenario: 正式 build 無繞過路徑

- **WHEN** 以 release 組態建置
- **THEN** SignIn SHALL NOT 出現「略過登入，直接看 Demo」

### Requirement: 三畫面版式與用語一致

SignIn/SignUp/ForgotPassword 的欄位 label SHALL 為繁中（「電子郵件」）；ForgotPassword SHALL 具品牌 lockup 且標題置中（與 SignUp 一致）；文字連結觸控目標 SHALL ≥44pt。

#### Scenario: 標籤語言一致

- **WHEN** 檢視任一 auth 畫面
- **THEN** 欄位 label SHALL NOT 出現「Email」英文字樣與繁中並存的混用

### Requirement: 登出確認精確且 scrim 可辨

登出確認文案 SHALL 對所有登入方式皆精確（SHALL NOT 假設密碼登入）；確認對話框 scrim SHALL 足夠深使背景內容不可讀。

#### Scenario: Google 使用者登出

- **WHEN** Google 登入使用者按登出
- **THEN** 確認文案 SHALL NOT 出現「重新輸入帳號密碼」
