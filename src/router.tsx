/**
 * BarTalk v8.2.5 — AppRoutes
 * Sistema di routing con React Router v7.
 * Usa Routes/Route dentro BrowserRouter (non createBrowserRouter)
 * per compatibilita con i context providers nel tree.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { PageShell } from './components/Layout/PageShell';
import type { CourseCategoryId } from './types/courses';

// ── Lazy-loaded pages ───────────────────────────────────────────────
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const DebugPage = lazy(() => import('./pages/DebugPage').then(m => ({ default: m.DebugPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));

// ── V2 Lazy-loaded pages ────────────────────────────────────────────
const CoursePanel = lazy(() => import('./components/Courses/CoursePanel').then(m => ({ default: m.CoursePanel })));
const MaestroSelector = lazy(() => import('./components/Maestro/MaestroSelector').then(m => ({ default: m.MaestroSelector })));
const LifeTutorTab = lazy(() => import('./components/LifeTutor/LifeTutorTab').then(m => ({ default: m.LifeTutorTab })));
const FreeVoiceTab = lazy(() => import('./components/FreeVoice/FreeVoiceTab'));
const ProgressDashboard = lazy(() => import('./components/Education/ProgressDashboard').then(m => ({ default: m.ProgressDashboard })));
const BillingPanel = lazy(() => import('./components/Billing/BillingPanel').then(m => ({ default: m.BillingPanel })));
const LandingPage = lazy(() => import('./components/Landing/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyPolicy = lazy(() => import('./components/Legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./components/Legal/TermsOfService').then(m => ({ default: m.TermsOfService })));

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

/** V2 page wrapper: Suspense + ErrorBoundary + PageShell (Navbar + layout) */
function V2({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ErrorBoundary>
        <PageShell>{children}</PageShell>
      </ErrorBoundary>
    </Suspense>
  );
}

/**
 * Maestro standalone page wrapper.
 * When accessed directly (not from a course), shows all maestri
 * with category "altro" and navigates to chat on selection.
 */
function MaestroPage() {
  return (
    <MaestroSelector
      category={"altro" as CourseCategoryId}
      courseId=""
      lessonIndex={0}
      onSelect={(maestroId: string) => {
        // Navigate to chat with selected maestro context
        window.location.href = `/radio-chat?maestro=${encodeURIComponent(maestroId)}`;
      }}
      onBack={() => window.history.back()}
    />
  );
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
      <Route path="/settings" element={<V2><SettingsPage /></V2>} />
      <Route path="/radio-debug" element={<V2><DebugPage /></V2>} />

      {/* V2 Routes — wrapped with PageShell (Navbar + full layout) */}
      <Route path="/courses" element={<V2><CoursePanel /></V2>} />
      <Route path="/maestro" element={<V2><MaestroPage /></V2>} />
      <Route path="/life-tutor" element={<V2><LifeTutorTab /></V2>} />
      <Route path="/free-voice" element={<V2><FreeVoiceTab /></V2>} />
      <Route path="/progress" element={<V2><ProgressDashboard /></V2>} />
      <Route path="/billing" element={<V2><BillingPanel /></V2>} />
      <Route path="/landing" element={<Wrap><LandingPage onLogin={() => { window.location.href = '/login'; }} onRegister={() => { window.location.href = '/login'; }} onGuest={() => { window.location.href = '/radio-chat'; }} /></Wrap>} />
      <Route path="/privacy" element={<V2><PrivacyPolicy onClose={() => window.history.back()} /></V2>} />
      <Route path="/terms" element={<V2><TermsOfService onClose={() => window.history.back()} /></V2>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/radio-chat" replace />} />
    </Routes>
  );
}
