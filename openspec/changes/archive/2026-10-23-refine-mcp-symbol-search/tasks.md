## 1. Symbol search

- [x] 1.1 TDD `isResolvedSymbol` and filter shells inside `rankSymbolCandidates`
- [x] 1.2 Update `search_symbol` description and no-match hint for Chinese names; mention codes + names in the import tool descriptions

## 2. Import

- [x] 2.1 TDD `normalizeImportRow` `defaultAssetType` option
- [x] 2.2 `resolveSymbols` treats TW/US shells as unknown and returns master asset types; `assess` passes them to normalization
- [x] 2.3 Integration tests: shell symbol rejected, asset_type taken from master

## 3. Delete preview

- [x] 3.1 Sort delete targets with `sortTransactionsChronologically`; integration test for order

## 4. Verify

- [x] 4.1 typecheck, lint, prettier, functions unit + emulator integration tests green
