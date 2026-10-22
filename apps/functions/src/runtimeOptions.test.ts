import * as deployed from './index';

/**
 * Guard for functions-runtime-limits: every exported Cloud Function must declare bounded
 * scaling and the project region, so a new function cannot ship with the 2nd-gen default
 * of 100 instances. Reads the manifest firebase-functions builds at definition time.
 */

interface Endpoint {
  region?: string[];
  maxInstances?: number | null;
}

const USER_HTTP = [
  'fetchQuote',
  'fetchQuotes',
  'fetchIntraday',
  'fetchSymbolMeta',
  'ensureHistory',
];
const BACKGROUND = ['scheduledUsdRate', 'seedUsdRate', 'onSymbolCreatedFetchQuote'];

const endpoints = Object.entries(deployed).map(
  ([name, fn]) => [name, (fn as { __endpoint?: Endpoint }).__endpoint] as const,
);

describe('runtime limits', () => {
  it('every exported function exposes a deploy manifest', () => {
    expect(endpoints.length).toBeGreaterThan(0);
    for (const [name, ep] of endpoints) {
      expect({ name, hasEndpoint: ep !== undefined }).toEqual({ name, hasEndpoint: true });
    }
  });

  it.each(endpoints)('%s runs in asia-east1 with 1 ≤ maxInstances ≤ 3', (name, ep) => {
    expect({ name, region: ep?.region }).toEqual({ name, region: ['asia-east1'] });
    const max = ep?.maxInstances;
    expect({ name, capped: typeof max === 'number' && max >= 1 && max <= 3 }).toEqual({
      name,
      capped: true,
    });
  });

  it('caps user-facing HTTP functions at 3 and background functions at 1', () => {
    const byName = Object.fromEntries(endpoints);
    for (const name of USER_HTTP) expect([name, byName[name]?.maxInstances]).toEqual([name, 3]);
    for (const name of BACKGROUND) expect([name, byName[name]?.maxInstances]).toEqual([name, 1]);
    // Every deployed function is classified, so the split above stays exhaustive.
    expect(endpoints.map(([n]) => n).sort()).toEqual([...USER_HTTP, ...BACKGROUND].sort());
  });

  it('keeps ensureHistory within its 120 s time budget', () => {
    const ep = (deployed.ensureHistory as { __endpoint?: { timeoutSeconds?: number | null } })
      .__endpoint;
    expect(ep?.timeoutSeconds).toBe(120);
  });

  it('puts the App Check gate in front of every user-facing HTTP function', () => {
    for (const name of USER_HTTP) {
      const ep = (deployed as Record<string, { __endpoint?: { labels?: Record<string, string> } }>)[
        name
      ]?.__endpoint;
      expect([name, ep?.labels?.['app-check']]).toEqual([name, 'gated']);
    }
  });
});
