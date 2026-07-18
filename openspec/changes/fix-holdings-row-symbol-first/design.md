# Design — fix-holdings-row-symbol-first

## Context

`HoldingRow`（HoldingsOverviewScreen.tsx L169-244）：Avatar(34/40) + rowTitleLine（rowName=名稱 semibold 15 / rowSymbol=代號 12 弱色）+ rowSub + rowRight。`dense` prop 僅決定 Avatar 尺寸。Avatar/avatarColor 由 core/ui 匯入，其他畫面仍在用（不刪元件本身）。

## Decisions

1. **Avatar 整段移除**：JSX + import + `avatarColor` import + `dense` prop（含 call site）。core/ui 的 `Avatar` 元件保留（他處仍用）。
2. **對調＝樣式互換不新增層級**：代號用新 style `rowSymbolMain`（fontFamily.num.semibold、15、textPrimary、numericStyle）；名稱用 `rowNameSub`（text 字族、12、textWeak、flexShrink 1、numberOfLines 1）。順序：代號在前、名稱在後（baseline 對齊、gap 6 沿用）。
3. **a11y label 順序隨 DOM 自然變為「代號, 名稱, …」**——e2e 需檢查是否有依「名稱在前」的選擇器。
4. **左位補齊**：row 的 `gap: spacing.md` 只在有多個子元素時生效，移除 Avatar 後文字區自然左移，無需調 padding。

## Risks

- 台股中文名（元大台灣50）與美股英文長名截斷行為：名稱降為 12 號輔字後截斷更常見，可接受（owner 認代號）。
