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
        manualChunks(id) {
          // Three.js — heavy 3D library, loaded only by carousel
          if (id.includes('node_modules/three')) return 'three';
          // React core
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          // Router
          if (id.includes('node_modules/react-router')) return 'router';
          // Supabase
          if (id.includes('node_modules/@supabase')) return 'supabase';
          // PDF/DOCX/XLSX parsing libs
          if (id.includes('node_modules/mammoth') || id.includes('node_modules/pdf-parse') || id.includes('node_modules/xlsx')) return 'file-parsers';
          // GSAP animation
          if (id.includes('node_modules/gsap')) return 'gsap';
          // AI/orchestration core — split heavy lib modules
          if (id.includes('/lib/orchestrator') || id.includes('/lib/proxy') || id.includes('/lib/streaming') || id.includes('/lib/memory') || id.includes('/lib/convergence') || id.includes('/lib/prompts') || id.includes('/lib/promptSections')) return 'ai-core';
          // TTS/Audio modules
          if (id.includes('/lib/tts') || id.includes('/lib/audioAnalyzer') || id.includes('/lib/audioStorage') || id.includes('/lib/voiceSuggester') || id.includes('/lib/pronunciationAnalyzer')) return 'audio';
          // Course/Education modules
          if (id.includes('/lib/courseGenerator') || id.includes('/lib/courseCatalog') || id.includes('/lib/assessmentEngine') || id.includes('/lib/lessonContentGenerator') || id.includes('/lib/maestroEngine') || id.includes('/lib/educationAPI') || id.includes('/lib/studentProfile') || id.includes('/lib/lifeTutor')) return 'education';
          // DB/Storage layer
          if (id.includes('/lib/supabase') || id.includes('/lib/dbSync') || id.includes('/lib/dbValidation') || id.includes('/lib/storage') || id.includes('/lib/apiService')) return 'data-layer';
        },
      },
    },
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
