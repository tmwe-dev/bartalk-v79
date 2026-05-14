/**
 * BarTalk v8.2.6 — AppRoutes
 * Sistema di routing con React Router v7.
 * Usa Routes/Route dentro BrowserRouter (non createBrowserRouter)
 * per compatibilita con i context providers nel tree.
 */

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
 * Uses React Router navigation (no full page reload).
 */
function MaestroPage() {
  const navigate = useNavigate();
  return (
    <MaestroSelector
      category={"altro" as CourseCategoryId}
      courseId=""
      lessonIndex={0}
      onSelect={(maestroId: string) => {
        navigate(`/radio-chat?maestro=${encodeURIComponent(maestroId)}`);
      }}
      onBack={() => navigate(-1)}
    />
  );
}

/** Landing page wrapper with proper React Router navigation */
function LandingPageWrapper() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onLogin={() => navigate('/login')}
      onRegister={() => navigate('/login')}
      onGuest={() => navigate('/radio-chat')}
    />
  );
}

/** Privacy/Terms close handler with fallback */
function PrivacyPageWrapper() {
  const navigate = useNavigate();
  return <PrivacyPolicy onClose={() => navigate(-1)} />;
}

function TermsPageWrapper() {
  const navigate = useNavigate();
  return <TermsOfService onClose={() => navigate(-1)} />;
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
      <Route path="/landing" element={<Wrap><LandingPageWrapper /></Wrap>} />
      <Route path="/privacy" element={<V2><PrivacyPageWrapper /></V2>} />
      <Route path="/terms" element={<V2><TermsPageWrapper /></V2>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/radio-chat" replace />} />
    </Routes>
  );
}
