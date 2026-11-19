import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import singleScope from './build/single-scope.js';
import foodData from './build/food-data.js';
import serviceWorker from './build/service-worker.js';

const here = p => fileURLToPath(new URL(p, import.meta.url));

// which build this is, for error reports: the commit it was built from
let version = 'dev';
try {
  version =
    execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim() || version;
} catch {
  // not a git checkout: leave it as 'dev'
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  base: './', // relative paths, so the build works from any folder and later inside the phone shell
  plugins: [singleScope({ dir: here('./src/app') }), foodData({ dir: here('../prototype/app') }), serviceWorker()],
  server: { port: 8765, strictPort: true },
  preview: { port: 8765, strictPort: true },
});
