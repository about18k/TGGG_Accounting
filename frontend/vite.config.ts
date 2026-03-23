import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('jspdf')) {
            return 'vendor-jspdf';
          }

          if (id.includes('html2canvas')) {
            return 'vendor-html2canvas';
          }

          if (id.includes('dompurify')) {
            return 'vendor-dompurify';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('clsx')
          ) {
            return 'vendor-ui';
          }

          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
