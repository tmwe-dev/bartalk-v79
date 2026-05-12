/**
 * BarTalk v8.2 — AppRoutes
 * Sistema di routing con React Router v7.
 * Usa Routes/Route dentro BrowserRouter (non createBrowserRouter)
 * per compatibilità con i context providers nel tree.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// ── Lazy-loaded pages ───────────────────────────────────────────────
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DebugPage = lazy(() => import('./pages/DebugPage').then(m => ({ default: m.DebugPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));

// ── Loading fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <span>Caricamento...</span>
    </div>
  );
}

// ── Suspense wrapper ────────────────────────────────────────────────
function Wrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Route definitions ───────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/radio-chat" replace />} />
      <Route path="/welcome" element={<Wrap><WelcomePage /></Wrap>} />
      <Route path="/login" element={<Wrap><LoginPage /></Wrap>} />
      <Route path="/auth/callback" element={<Wrap><AuthCallback /></Wrap>} />
      <Route path="/radio-chat" element={<Wrap><ChatPage /></Wrap>} />
      <Route path="/settings" element={<Wrap><SettingsPage /></Wrap>} />
      <Route path="/radio-debug" element={<Wrap><DebugPage /></Wrap>} />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/radio-chat" replace />} />
    </Routes>
  );
}
