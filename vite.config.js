import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false
  },
  optimizeDeps: {
    include: ['three']
  }
})
