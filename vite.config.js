import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Mã bản build: ghi vào bundle (__BUILD_ID__) và vào dist/version.json để bản đang chạy biết khi có bản mới.
const BUILD_ID = Date.now().toString(36)
const emitVersion = () => ({
  name: 'emit-version',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
  },
})

// Cấu hình Vite: plugin Vue 3 + tách PixiJS ra chunk riêng để cache tốt hơn.
export default defineConfig({
  base: './',
  plugins: [vue(), emitVersion()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
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
