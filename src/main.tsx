import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initGlobalErrorHandlers } from './lib/errorTracker'
import './index.css'
import './v2-styles.css'
import App from './App.tsx'

// Inizializza cattura errori globale prima del render
initGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
