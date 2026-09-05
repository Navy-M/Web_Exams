import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: command === 'serve' ? {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
      allowedHosts: ['localhost', '127.0.0.1', 'tipnama.ir', 'www.tipnama.ir'],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    } : undefined,
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      target: 'es2019',
      emptyOutDir: true,
    },
  };
});
