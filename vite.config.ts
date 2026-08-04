import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.VITE_BASE_PATH || '/isivoltpro-ot/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        input: {
          app: fileURLToPath(new URL('./index.html', import.meta.url)),
          demo: fileURLToPath(new URL('./demo.html', import.meta.url)),
          ecosystem: fileURLToPath(new URL('./ecosystem.html', import.meta.url)),
        },
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  };
});
