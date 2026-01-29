import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // Allow sandbox hostname
    host: '0.0.0.0', // Expose to external network
    proxy: {
      '/api': {
        target: 'http://localhost:3040',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    minify: false,
    outDir: 'dist'
  }
})
