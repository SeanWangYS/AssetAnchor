import { resolveMcpConfig, parseCookieKeys, isAllowedRedirectUri } from './config';

describe('resolveMcpConfig', () => {
  it('derives emulator URLs from the project and emulator ports', () => {
    const cfg = resolveMcpConfig({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'demo-x',
    });
    expect(cfg).toEqual({
      isEmulator: true,
      issuer: 'http://127.0.0.1:5001/demo-x/asia-east1/mcp',
      pathPrefix: '/demo-x/asia-east1/mcp',
      hostingOrigin: 'http://127.0.0.1:5002',
      resourceUrl: 'http://127.0.0.1:5002/mcp',
      connectUrl: 'http://127.0.0.1:5002/connect',
      registrationLimit: 10,
    });
  });

  it('honours emulator origin overrides (integration tests on other ports)', () => {
    const cfg = resolveMcpConfig({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'demo-x',
      MCP_EMULATOR_FUNCTIONS_ORIGIN: 'http://127.0.0.1:6101',
      MCP_EMULATOR_HOSTING_ORIGIN: 'http://127.0.0.1:6100/',
    });
    expect(cfg.issuer).toBe('http://127.0.0.1:6101/demo-x/asia-east1/mcp');
    expect(cfg.resourceUrl).toBe('http://127.0.0.1:6100/mcp');
  });

  it('uses the configured Cloud Run issuer and the Hosting origin in production', () => {
    const cfg = resolveMcpConfig({
      GCLOUD_PROJECT: 'assetanchor-832df',
      MCP_ISSUER_URL: 'https://mcp-abc123-de.a.run.app/',
    });
    expect(cfg).toEqual({
      isEmulator: false,
      issuer: 'https://mcp-abc123-de.a.run.app',
      pathPrefix: '',
      hostingOrigin: 'https://assetanchor-832df.web.app',
      resourceUrl: 'https://assetanchor-832df.web.app/mcp',
      connectUrl: 'https://assetanchor-832df.web.app/connect',
      registrationLimit: 10,
    });
  });

  it('reads a positive registration limit and ignores junk', () => {
    const base = { FUNCTIONS_EMULATOR: 'true', GCLOUD_PROJECT: 'p' };
    expect(resolveMcpConfig({ ...base, MCP_REGISTRATION_LIMIT: '500' }).registrationLimit).toBe(
      500,
    );
    expect(resolveMcpConfig({ ...base, MCP_REGISTRATION_LIMIT: '-1' }).registrationLimit).toBe(10);
  });

  it('refuses to run in production without an https issuer', () => {
    expect(() => resolveMcpConfig({ GCLOUD_PROJECT: 'p' })).toThrow('MCP_ISSUER_URL');
    expect(() =>
      resolveMcpConfig({ GCLOUD_PROJECT: 'p', MCP_ISSUER_URL: 'http://insecure.example' }),
    ).toThrow('MCP_ISSUER_URL');
  });

  it('requires a project id', () => {
    expect(() => resolveMcpConfig({ FUNCTIONS_EMULATOR: 'true' })).toThrow('GCLOUD_PROJECT');
  });
});

describe('parseCookieKeys', () => {
  it('splits comma-separated keys and drops blanks', () => {
    expect(parseCookieKeys(' k1 , k2,, ')).toEqual(['k1', 'k2']);
  });

  it('rejects empty input', () => {
    expect(() => parseCookieKeys('')).toThrow('MCP_COOKIE_KEYS');
    expect(() => parseCookieKeys(undefined)).toThrow('MCP_COOKIE_KEYS');
  });
});

describe('isAllowedRedirectUri', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'http://localhost:6274/oauth/callback',
    'http://127.0.0.1:33418/callback',
  ])('accepts %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    'http://evil.example/cb',
    'claude://callback',
    'javascript:alert(1)',
    'https://user:pass@claude.ai/cb',
    'https://claude.ai/cb#frag',
    'not a url',
  ])('rejects %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });
});
