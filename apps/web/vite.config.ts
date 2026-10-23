import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Login and consent page for MCP connectors (add-mcp-auth-readonly D8), deployed to Firebase
 * Hosting. Hosting `cleanUrls` serves `connect.html` at `/connect`.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { connect: resolve(import.meta.dirname, 'connect.html') },
    },
  },
});
