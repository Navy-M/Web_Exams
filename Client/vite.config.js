import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  server: command === 'serve' ? {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: ['tipnama.ir', 'www.tipnama.ir']
  } : undefined,
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    target: 'es2019',
    emptyOutDir: true
  }
}));
