// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';

import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://uni-repo.sherqo.me',
  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },

  adapter: vercel(),
});
