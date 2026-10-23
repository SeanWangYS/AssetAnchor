/** OAuth scopes on the MCP resource (ADR-0011). Write arrived with add-mcp-transaction-import. */
export const READ_SCOPE = 'transactions.read';
export const WRITE_SCOPE = 'transactions.write';
export const ALL_SCOPES = [READ_SCOPE, WRITE_SCOPE] as const;
