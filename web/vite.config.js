import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import singleScope from './build/single-scope.js';
import foodData from './build/food-data.js';
import serviceWorker from './build/service-worker.js';

const here = p => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './', // relative paths, so the build works from any folder and later inside the phone shell
  plugins: [singleScope({ dir: here('./src/app') }), foodData({ dir: here('../prototype/app') }), serviceWorker()],
  server: { port: 8765, strictPort: true },
  preview: { port: 8765, strictPort: true },
});
