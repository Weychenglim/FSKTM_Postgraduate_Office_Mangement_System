import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Auth API is served by the Django backend (see backend/). Other /api
        // routes are mocked client-side while only auth is live.
        '/api': {
          target: `http://localhost:${process.env.API_PORT ?? 8000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
