// Generates values for the mcp function's secrets (docs/runbook/mcp-operations.md).
// Usage: node apps/functions/scripts/generate-mcp-secrets.mjs cookie|jwks
// Pipe straight into `firebase functions:secrets:set <NAME> --data-file -`; never commit output.
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import process from 'node:process';

const kind = process.argv[2];

if (kind === 'cookie') {
  // Two keys: the first signs, the rest still verify, so keys can rotate without logouts.
  process.stdout.write(
    [randomBytes(32), randomBytes(32)].map((b) => b.toString('base64url')).join(','),
  );
} else if (kind === 'jwks') {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = {
    ...privateKey.export({ format: 'jwk' }),
    kid: randomUUID(),
    use: 'sig',
    alg: 'RS256',
  };
  process.stdout.write(JSON.stringify({ keys: [jwk] }));
} else {
  process.stderr.write('usage: generate-mcp-secrets.mjs cookie|jwks\n');
  process.exit(1);
}
