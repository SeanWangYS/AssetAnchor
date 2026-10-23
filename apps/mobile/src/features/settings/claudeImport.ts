/**
 * Claude connector links for the import guide (claude-import-spec §3.2, ADR-0011).
 * `EXPO_PUBLIC_MCP_CONNECTOR_URL` overrides the connector for local emulator testing.
 */
export const CLAUDE_CONNECTOR_URL =
  process.env.EXPO_PUBLIC_MCP_CONNECTOR_URL ?? 'https://assetanchor-832df.web.app/mcp';

export const CLAUDE_CONNECTORS_SETTINGS_URL = 'https://claude.ai/settings/connectors';
