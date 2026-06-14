import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

/**
 * Functions runtime 打包（ADR-0005 / design D5）。
 *
 * Cloud Functions runtime 不能 require `.ts`，且雲端 `npm install` 解析不到
 * monorepo 的 `workspace:*`。因此 `@assetanchor/shared` **不**列在 package.json
 * （避免上傳的 package.json 帶 `workspace:` 讓雲端 npm install 爆 EUNSUPPORTEDPROTOCOL），
 * 改以 alias 指向其 source、連同 `decimal.js` 一起 bundle 進單一 `lib/index.js`；
 * `firebase-admin` / `firebase-functions` 維持 external（雲端 runtime / dependencies 提供）。
 *
 * 輸出 CJS：避免 Cloud Functions ESM runtime 的雷；esbuild 會把 shared 的 ESM
 * source（含 `.js` 指定的 TS 檔）正確轉成 CJS。
 *
 * cwd 注意：build 一律經 `pnpm --filter @assetanchor/functions build`（含 firebase
 * predeploy），cwd 恆為 apps/functions，故以 cwd 解析 shared 絕對路徑可靠。
 */
const sharedEntry = resolve(process.cwd(), '../../packages/shared/src/index.ts');

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['cjs'],
  platform: 'node',
  target: 'node22',
  bundle: true,
  clean: true,
  sourcemap: true,
  noExternal: ['@assetanchor/shared', 'decimal.js'],
  external: ['firebase-admin', 'firebase-functions'],
  esbuildOptions(options) {
    options.alias = { ...(options.alias ?? {}), '@assetanchor/shared': sharedEntry };
  },
});
