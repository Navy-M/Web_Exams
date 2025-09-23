import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // allow external access on VPS
    port: 5174,        // your custom port
    strictPort: true
  }
})
