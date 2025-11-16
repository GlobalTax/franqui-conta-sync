import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // UI components (Radix UI)
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
          ],
          
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          
          // PDF processing (heavy)
          'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
          
          // Charts (heavy)
          'vendor-charts': ['recharts'],
          
          // Excel export (heavy)
          'vendor-excel': ['xlsx', 'jspdf', 'jspdf-autotable'],
          
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Forms & validation
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Utils
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: mode === 'development',
  },
}));
