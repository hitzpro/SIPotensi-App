// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon'; // Pastikan ini ada
import vercel from '@astrojs/vercel/serverless'; // 1. Import Adapter

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind(), 
    icon() // Pastikan ini ada di dalam array
  ],
  devToolbar: {
    enabled: false
  }
});