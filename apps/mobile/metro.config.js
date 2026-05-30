// Expo SDK 52+ auto-configures Metro for pnpm monorepos (watchFolders / nodeModulesPaths),
// so no manual monorepo wiring is needed here.
//
// The ONE thing we must add: `@assetanchor/shared` is shared TypeScript SOURCE that uses
// explicit `.js` import specifiers (ESM/NodeNext convention, e.g. `export * from './enums/index.js'`).
// tsc (moduleResolution: Bundler) and ts-jest understand `.js` -> `.ts`, but Metro does not —
// it tries to resolve the literal `./enums/index.js` and fails ("Unable to resolve module").
// Fix: for relative specifiers ending in `.js`, retry resolution with the extension stripped so
// Metro finds the `.ts`/`.tsx` source; fall back to the original for any real `.js` file.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if ((moduleName.startsWith('./') || moduleName.startsWith('../')) && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    } catch {
      // not a `.js`-specified TS source — fall through to the default resolver
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
