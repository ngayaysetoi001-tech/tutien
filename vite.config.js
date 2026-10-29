import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Cấu hình Vite: plugin Vue 3 + tách PixiJS ra chunk riêng để cache tốt hơn.
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { host: true, port: 5173 },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ['pixi.js'],
        },
      },
    },
  },
})
