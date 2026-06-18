## ADDED Requirements

### Requirement: deriveHoldings 對缺欄位 fail-soft（但對損毀資料仍 fail-loud）

`deriveHoldings` 讀取交易金額/數量欄位（`total`/`fee`/`tax`/`quantity`）時，對**缺值**（pre-ADR-0005 舊 doc 缺欄位，runtime 為 `undefined`/`null`）SHALL fail-soft：以 `0` 視之、該筆貢獻 0、**不得**丟 `DecimalError`。此防禦 MUST 由可測純函式（`toSafeDecimalString`）實作並有單元測試。

**邊界紀律（ADR-0007 §5b 不被弱化）**：欄位**存在但非法**（如 `'Infinity'`/`'NaN'`/非數字字串）屬資料損毀，SHALL 仍 fail-loud（擲 `InvalidMoneyValueError`），**不得**被靜默歸零。缺值 vs 損毀的分界＝欄位是否存在。正常（欄位齊全且合法）資料的推導結果 MUST 與既有行為完全一致（精度語意不變）。

#### Scenario: 舊 doc 缺金額欄位不 crash

- **WHEN** `deriveHoldings` 收到一筆缺（undefined）`total`/`fee`/`tax` 的交易 doc
- **THEN** 不丟例外；缺值視為 0，其餘交易照常推導

#### Scenario: 損毀（present-but-invalid）仍 fail-loud

- **WHEN** 某交易的 `total` 存在但為 `'Infinity'` 等非法值
- **THEN** 擲 `InvalidMoneyValueError`（不被歸零）

#### Scenario: 欄位齊全行為不變

- **WHEN** 所有交易欄位齊全且合法
- **THEN** 推導結果（股數/成本/均價/已實現）與防禦前完全一致
