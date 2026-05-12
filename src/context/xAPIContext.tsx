/**
 * BarTalk v8 — xAPI Context Provider
 * Queue in-memory con batch flush ogni 30 secondi.
 * Espone funzioni per registrare eventi educativi come statement xAPI.
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { XAPIStatementWithMeta } from '../types/education';
import { sendXAPIStatements } from '../lib/educationAPI';
import { getAuthToken } from '../lib/authToken';

// ── Context Types ───────────────────────────────────────────────────

interface XAPIContextValue {
  /** Accoda uno o piu statement xAPI */
  enqueue: (statements: XAPIStatementWithMeta | XAPIStatementWithMeta[]) => void;
  /** Forza flush immediato della coda */
  flush: () => Promise<void>;
  /** Numero statement in coda */
  queueSize: number;
}

const XAPICtx = createContext<XAPIContextValue | null>(null);

// ── Costanti ────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 30_000;  // batch ogni 30s
const MAX_QUEUE_SIZE = 100;         // flush automatico a 100

// ── Provider ────────────────────────────────────────────────────────

export function XAPIProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<XAPIStatementWithMeta[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Flush: invia batch a /api/xapi ──
  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    // Non inviare se non autenticato (skip-mode)
    const token = getAuthToken();
    if (!token) {
      // In skip-mode, salva in localStorage come fallback
      try {
        const existing = JSON.parse(localStorage.getItem('bt_xapi_pending') || '[]');
        const merged = [...existing, ...queueRef.current].slice(-200); // max 200 pending
        localStorage.setItem('bt_xapi_pending', JSON.stringify(merged));
      } catch { /* localStorage pieno */ }
      queueRef.current = [];
      return;
    }

    // Prendi e svuota la coda
    const batch = queueRef.current.splice(0, 50); // max 50 per batch

    const ok = await sendXAPIStatements(batch);
    if (!ok) {
      // Rimetti in coda se fallito (davanti)
      queueRef.current.unshift(...batch);
      console.warn('[xAPI] Flush failed, statements re-queued:', batch.length);
    }
  }, []);

  // ── Enqueue ──
  const enqueue = useCallback((statements: XAPIStatementWithMeta | XAPIStatementWithMeta[]) => {
    const arr = Array.isArray(statements) ? statements : [statements];
    queueRef.current.push(...arr);

    // Auto-flush se coda troppo piena
    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      flush();
    }
  }, [flush]);

  // ── Timer periodico ──
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      flush();
    }, FLUSH_INTERVAL_MS);

    // Processa pending da skip-mode -> autenticato
    const token = getAuthToken();
    if (token) {
      try {
        const pendingRaw = localStorage.getItem('bt_xapi_pending');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (Array.isArray(pending) && pending.length > 0) {
            queueRef.current.push(...pending);
            localStorage.removeItem('bt_xapi_pending');
          }
        }
      } catch { /* ignora */ }
    }

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [flush]);

  // ── beforeunload: flush sync ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueRef.current.length === 0) return;

      // Usa sendBeacon per fire-and-forget
      const token = getAuthToken();
      if (token && queueRef.current.length > 0) {
        const payload = JSON.stringify({ statements: queueRef.current.slice(0, 50) });
        navigator.sendBeacon('/api/xapi', new Blob([payload], { type: 'application/json' }));
      }

      // Salva anche in localStorage come fallback
      try {
        const existing = JSON.parse(localStorage.getItem('bt_xapi_pending') || '[]');
        const merged = [...existing, ...queueRef.current].slice(-200);
        localStorage.setItem('bt_xapi_pending', JSON.stringify(merged));
      } catch { /* localStorage pieno */ }

      queueRef.current = [];
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <XAPICtx.Provider value={{
      enqueue,
      flush,
      queueSize: queueRef.current.length,
    }}>
      {children}
    </XAPICtx.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────

export function useXAPI(): XAPIContextValue {
  const ctx = useContext(XAPICtx);
  if (!ctx) throw new Error('useXAPI must be used within XAPIProvider');
  return ctx;
}
