# Proposal — fix-holdings-row-symbol-first

## Why

owner 拍板（2026-07-18）：持倉總覽清單 row 的圓形代號標「不具資訊價值、不美觀」；且 owner 閱讀習慣認**代號**不認全名，現行「名稱為主、代號為輔」順序與使用習慣相反。

## What Changes

僅動**持倉總覽頁**清單 row（三種分組共用同一 row）：

1. 移除左側圓形 Avatar（含 dense 尺寸邏輯）。
2. 標題行對調：代號升為主視覺（semibold 15 主色、Nunito 數字字體）、名稱降為輔（12 弱色、可截斷）。
3. 第二行（N 股 · 均價）與右欄（市值/報酬%/更新中/查無代號）不動。

設計包同步（ADR-0008）：`holdings-overview-spec.md` §3.1 item 7 + 原型 jsx，獨立 commit。

## Non-Goals

其他畫面（個股詳情 header、帳戶詳情持倉清單、標的搜尋結果列）**不動**——owner 明示這次只動持倉總覽。
