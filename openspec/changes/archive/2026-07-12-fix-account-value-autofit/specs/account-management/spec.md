## MODIFIED Requirements

### Requirement: 帳戶估值以市值呈現

帳戶詳情 hero、帳戶列表 row、帳戶詳情持股列的估值 SHALL 以**真實報價市值**呈現，不得以投入成本作為市值代理。帳戶詳情 hero SHALL 顯示「帳戶市值」（持股市值 + 現金，基礎幣別）＋拆分小字（持股市值 · 現金）＋並列「投入成本 · 未實現損益（金額 + %）」（B 案）；持股列 SHALL 顯示市值 + 報酬%（原幣別，均價留於 subtitle）。報價缺失/過期時 SHALL 複用 live-quotes 的部分渲染與降級（「更新中…」／「查無代號」／最後已知值 + asOf + 重試），**不得**以成本冒充市值；全部持股皆無報價時市值/未實現顯示「報價載入中…」而現金照常顯示。多幣別 SHALL 以當日匯率換算進基礎幣別合計（ADR-0005），rates 未就緒時退回揭露而非靜默混算。所有運算 SHALL 用 `Money`，UI 出口才 `toDisplayString()`。持股列表維持無帳戶識別色點（A1 / holdings D3）。

帳戶詳情 hero 的「帳戶市值」**主數字**在顯示層 SHALL 滿足兩項可讀性條件：(1) SHALL 顯示到**小數點第二位**（含基礎幣別為 TWD 者，如 `NT$ 1,234,567.89`），對齊 `toDisplayString` 的 2 位小數語意——顯示層小數位不受基礎幣別影響；(2) 字級 SHALL **依數字長度自動縮放**（`adjustsFontSizeToFit` + 合理 `minimumFontScale`）以**完整單行**呈現，極長金額 SHALL NOT 被截斷或以省略號取代。此為顯示層行為，運算精度不變（仍走 `Money`，Firestore 維持 10 位 canonical string）。

#### Scenario: 帳戶詳情 hero 顯示市值與成本/未實現

- **WHEN** 使用者進入某帳戶詳情且該帳戶持股取得報價
- **THEN** hero SHALL 顯示「帳戶市值＝持股市值 + 現金」（基礎幣別）、拆分小字「持股市值 X · 現金 Y」、並列「投入成本 X · 未實現損益 ±Y（±Z%）」（未實現 = 市值 − 成本，正綠 ▲ / 負紅 ▼）

#### Scenario: hero 帳戶市值顯示到小數第二位（含 TWD）

- **WHEN** 使用者進入基礎幣別為 TWD 的帳戶詳情且帳戶市值可計算
- **THEN** hero 主數字 SHALL 顯示到小數點第二位（如 `NT$ 1,234,567.89`），而非 0 位小數；基礎幣別為 USD 者同樣顯示 2 位小數

#### Scenario: hero 帳戶市值長數字自動縮放單行完整呈現

- **WHEN** 帳戶市值為極大金額（如逾七位數再加兩位小數）致預設字級一行放不下
- **THEN** hero 主數字字級 SHALL 自動縮小至可完整單行呈現（`adjustsFontSizeToFit`），數字 SHALL NOT 被截斷、SHALL NOT 換行、SHALL NOT 以省略號取代；短數字維持較大基礎字級

#### Scenario: 持股列顯示市值與報酬率

- **WHEN** 帳戶詳情列出該帳戶持股且某持股有報價
- **THEN** 該列右側 SHALL 顯示該持股市值（原幣別）與報酬%（`Pnl`），均價顯示於 subtitle

#### Scenario: 帳戶列表 row 顯示市值

- **WHEN** 使用者於帳戶列表檢視某有持股的帳戶
- **THEN** 該 row 右側 SHALL 顯示該帳戶持股市值（原幣別；多幣別各列），非投入成本

#### Scenario: 報價缺失降級不以成本冒充

- **WHEN** 某帳戶部分持股無報價、或全部無報價
- **THEN** 有報價者先納入市值合計、缺者標「更新中…」/「查無代號」；全缺時市值/未實現顯示「報價載入中…」但**現金照常顯示**；任何情況 SHALL NOT 以投入成本填充市值欄位

#### Scenario: 多幣別換算進基礎幣別

- **WHEN** 帳戶同時持有 TWD 與 USD 標的且匯率就緒
- **THEN** hero 帳戶市值/成本/未實現 SHALL 以當日匯率換算進基礎幣別合計；rates 未就緒時 SHALL 揭露（如「另計」）而非以 demo 值靜默混算
