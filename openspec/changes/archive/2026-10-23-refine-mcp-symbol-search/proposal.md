## Why

The 2026-10-23 claude.ai/Claude Code acceptance passed all write flows, but symbol lookup misled Claude: `search_symbol` returned empty-name shell symbols left by app typos (US_APPL, US_BTC, US_0050), Chinese names never matched (no symbol has `name_zh`; Yahoo only gives English), rows without `asset_type` were stored as STOCK even when the symbol is an ETF, and delete previews came back unordered.

## What Changes

- `search_symbol` drops candidates that have neither `name` nor `name_zh` (shells the quote source never resolved). Its description tells Claude to turn Chinese names into codes itself and search by code; the misleading 「元大台灣50」 example and the no-match hint are updated.
- `validate_transactions` / `create_transactions`: an existing TW/US symbol with no name is re-checked with the quote source like a new one, so a typo that already left a shell (APPL) is no longer accepted as existing.
- Rows that omit `asset_type` take the symbol master's `asset_type`; `STOCK` stays the fallback for symbols AssetAnchor does not have yet.
- `preview_delete_transactions` lists rows by trade date (same day: BUY before SELL). Confirmation tokens are unaffected (they digest rows sorted by ID).
- No schema, rules or UI change. Existing shell symbols are cleaned by the owner in the console.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: search_symbol filtering and Chinese-name guidance; validate_transactions symbol resolution and asset_type default; delete preview ordering.

## Impact

- `apps/functions/src/mcp/tools/symbolMatch.ts`, `tools/readTools.ts`, `import/importRows.ts`, `import/importTools.ts`, `edit/editTools.ts` and their tests.
- Redeploy `functions:mcp` only.
