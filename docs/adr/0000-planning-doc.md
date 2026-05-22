# ADR-000: Planning Document as Source of Truth

- **Status**: Accepted
- **Date**: 2026-05-23（planning doc v2.3.1）
- **Deciders**: Sean Wang

## Context

AssetAnchor 在 Sprint 0 開始前完成了完整 MVP 規劃（議題 1–7 全部收斂）。決策密度高、互相參照頻繁，若拆成多份 ADR 反而難維護。

## Decision

`docs/portfolio_tracker_planning.md` 為**規劃決策的 source of truth**。所有後續 ADR（0001+）皆為對某一決策的補述或重新評估，不重複論證已寫在 planning doc 內的內容。

## Consequences

- 任何 v2.3.1 後的核心決策變更，須同步更新 planning doc + 新增對應 ADR
- 新貢獻者第一份要讀的文件即為 planning doc
- planning doc 章節編號（§N）為穩定錨點，commit message 與 ADR 內可直接引用

## Alternatives Considered

- **拆成 N 份 ADR-000x**：規劃還在初期 / 議題互相影響大，拆開反而需要大量交叉引用，留待具體實作 sprint 時再各別生 ADR。
