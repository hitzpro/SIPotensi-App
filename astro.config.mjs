// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon'; // Pastikan ini ada

export default defineConfig({
  integrations: [
    tailwind(), 
    icon() // Pastikan ini ada di dalam array
  ],
  devToolbar: {
    enabled: false
  }
});