import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  // SPA fallback per React Router — tutte le rotte tornano a index.html
  // Vercel gestisce questo automaticamente con vercel.json rewrites
  build: {
    chunkSizeWarningLimit: 500,
    // Enable source map for production debugging
    sourcemap: false,
    // Minification target for modern browsers
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separare Three.js (usato da RadioCarousel3D) in chunk dedicato
          'three': ['three'],
          // Separare React core
          'react-vendor': ['react', 'react-dom'],
          // Separare router
          'router': ['react-router-dom'],
          // Separare Supabase
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
