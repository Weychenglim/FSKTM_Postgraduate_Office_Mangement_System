import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Allow HMR/file watching to be disabled in constrained local environments.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Auth, letter templates, and panel appointment APIs are served by
        // Django. Other unfinished modules can still use frontend mock mode.
        '/api': {
          target: `http://localhost:${process.env.API_PORT ?? 8000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
