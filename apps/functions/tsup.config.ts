import { defineConfig } from 'tsup';

/**
 * Functions runtime 打包（ADR-0005 / design D5）。
 *
 * Cloud Functions runtime 不能 require `.ts`，且雲端 `npm install` 解析不到
 * monorepo 的 `workspace:*`。因此把 `@assetanchor/shared`（source）與 `decimal.js`
 * bundle 進單一 `lib/index.js`；`firebase-admin` / `firebase-functions` 維持 external
 * （由雲端 runtime / package.json dependencies 提供）。
 *
 * 輸出 CJS：避免 Cloud Functions ESM runtime 的雷；esbuild 會把 shared 的 ESM
 * source（含 `.js` 指定的 TS 檔）正確轉成 CJS。
 */
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
});
