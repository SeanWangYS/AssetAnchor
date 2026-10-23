## Context

`symbols/{id}` is a global master that any signed-in app user may create (rules). The app creates the doc before the metadata fetch fills `name`, so a typo or wrong market leaves a doc with empty `name`/`name_zh`. MCP imports already refuse TW/US codes the quote source cannot find, but only when the doc is missing. `name_zh` is never populated by any writer.

## Goals / Non-Goals

**Goals:** stop shells from reaching Claude as candidates or as "existing" symbols; make Chinese-name screenshots work without new data; store the right asset type; readable delete previews.

**Non-Goals:** a `verified` field or any schema change; stopping the app from creating shells (UI + rules change); a Chinese name master list (TWSE/TPEx open data) — possible later change; deleting existing shells (owner console task).

## Decisions

- **"Resolved" = non-empty `name` or `name_zh`.** Metadata fetch writes `name` whenever the quote source knows the code, so emptiness is a reliable shell signal without a schema change. Pure helper `isResolvedSymbol` in `symbolMatch.ts`, applied inside `rankSymbolCandidates` so every caller gets it. A just-created legit symbol may be hidden briefly until its metadata lands; imports are unaffected because validate checks the quote source directly.
- **Shells count as unknown in `resolveSymbols`.** TW/US shells go to the quote source (`new` if found, else `missing`); a `new` result upserts metadata on create, repairing the shell. CRYPTO/OTHER keep current behaviour (no quote source to ask).
- **Chinese names via Claude, not data.** Tool descriptions instruct: convert Chinese names to codes with your own knowledge, search by code, and show code + name in the confirmation list so the user can catch a wrong mapping. Every write still needs the user's confirmation, which bounds the risk.
- **asset_type default from master.** `normalizeImportRow` gains an optional `defaultAssetType`; `assess` loads symbol docs first and passes the master type for rows that omit `asset_type`. The normalized row is what the confirmation token binds, and validate/create run the same path, so tokens stay deterministic.
- **Delete preview order** uses shared `sortTransactionsChronologically` on the targets; `digestRows` already sorts by ID, so tokens are unchanged.

## Risks / Trade-offs

- A legit symbol whose metadata fetch failed stays hidden from search → Claude can still validate by code; validate re-checks it and repairs it on import.
- Claude may map an obscure Chinese name wrongly → visible in the confirmation list before any write.
