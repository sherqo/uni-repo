// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

import cloudflare from '@astrojs/cloudflare';

let lastCommitDate = '';
try {
  lastCommitDate = execSync('git log -1 --format=%cI', { maxBuffer: 1024 }).toString().trim();
} catch {
  // not in a git repo or git unavailable — leave empty
}

export default defineConfig({
  site: 'https://uni-repo.sherqo.me',
  integrations: [sitemap()],

  vite: {
    define: {
      __LAST_COMMIT_DATE__: JSON.stringify(lastCommitDate),
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },

  adapter: cloudflare(),
});