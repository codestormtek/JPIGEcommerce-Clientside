import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: true
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    proxy: {
      // Forward all /api requests to the Express API (avoids CORS in dev)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Forward /uploads so product images work without auth in dev
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
