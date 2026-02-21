import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to the backend server
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
})
