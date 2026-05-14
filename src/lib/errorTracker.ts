/**
 * @module errorTracker
 * Centralized error capture and tracking system.
 * Collects API errors, UI errors, and unhandled exceptions with metadata,
 * stores them in localStorage, and provides retrieval and export utilities.
 */

export interface ErrorEvent {
  type: 'js_error' | 'unhandled_rejection' | 'react_error' | 'api_error' | 'network_error';
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent: string;
}

// Buffer circolare per gli ultimi N errori (utile per debug in produzione)
const ERROR_BUFFER_SIZE = 50;
const errorBuffer: ErrorEvent[] = [];

function pushError(event: ErrorEvent) {
  errorBuffer.push(event);
  if (errorBuffer.length > ERROR_BUFFER_SIZE) {
    errorBuffer.shift();
  }

  // Log strutturato in console (leggibile nei Vercel runtime logs)
  console.error(`[ErrorTracker] ${event.type}:`, {
    message: event.message,
    context: event.context,
    timestamp: event.timestamp,
  });
}

/**
 * Cattura un errore manualmente (da componenti, hook, etc.)
 */
export function captureError(
  error: Error | string,
  type: ErrorEvent['type'] = 'js_error',
  context?: Record<string, unknown>,
) {
  const err = typeof error === 'string' ? new Error(error) : error;
  pushError({
    type,
    message: err.message,
    stack: err.stack?.substring(0, 1000),
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
}

/**
 * Cattura errore da React ErrorBoundary
 */
export function captureReactError(error: Error, errorInfo?: { componentStack?: string | null }) {
  pushError({
    type: 'react_error',
    message: error.message,
    stack: error.stack?.substring(0, 1000),
    context: {
      componentStack: errorInfo?.componentStack?.substring(0, 500),
    },
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
}

/**
 * Cattura errore da chiamata API/proxy
 */
export function captureAPIError(
  provider: string,
  error: string,
  detail?: string,
  httpStatus?: number,
) {
  pushError({
    type: 'api_error',
    message: `${provider}: ${error}`,
    context: { provider, detail, httpStatus },
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
}

/**
 * Restituisce gli ultimi errori catturati (per debug/diagnostica)
 */
export function getRecentErrors(): ErrorEvent[] {
  return [...errorBuffer];
}

/**
 * Inizializza i listener globali per errori non catturati.
 * Chiamare una volta all'avvio dell'app.
 */
export function initGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  // Errori JS non catturati
  window.addEventListener('error', (event) => {
    // Ignora errori di script esterni (CORS) e di estensioni browser
    if (!event.filename || event.filename.includes('extension://')) return;

    pushError({
      type: 'js_error',
      message: event.message || 'Unknown error',
      stack: event.error?.stack?.substring(0, 1000),
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  // Promise rejection non gestite
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    pushError({
      type: 'unhandled_rejection',
      message: error?.message || String(error) || 'Unhandled rejection',
      stack: error?.stack?.substring(0, 1000),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  console.log('[ErrorTracker] Global error handlers initialized');
}
