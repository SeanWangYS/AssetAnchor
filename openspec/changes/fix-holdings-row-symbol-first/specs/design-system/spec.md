## ADDED Requirements

### Requirement: 持倉清單 row 版式

持倉總覽清單 row（三種分組共用）SHALL 為兩段式：中欄標題行以**代號為主視覺**（semibold 主色）、名稱為輔（弱色小字、可截斷），下行為「N 股 · 均價 X」；右欄市值＋報酬%。row SHALL NOT 含圓形代號標（owner 2026-07-18 拍板移除，取代設計稿原三段式「圓標＋名稱/代號」版式；core/ui Avatar 元件保留供他處使用）。本要求僅約束持倉總覽頁；其他畫面版式不在此範圍。

#### Scenario: 代號為主視覺

- **WHEN** 檢視持倉清單任一 row（任一分組模式）
- **THEN** 標題行 SHALL 以代號（如 2330、AAPL）為粗體主字、名稱為輔字，且 SHALL NOT 顯示圓形代號標
