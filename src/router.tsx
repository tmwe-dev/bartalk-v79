/**
 * BarTalk v8.2.5 — AppRoutes
 * Sistema di routing con React Router v7.
 * Usa Routes/Route dentro BrowserRouter (non createBrowserRouter)
 * per compatibilita con i context providers nel tree.
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

// ── Maestro page wrapper (MaestroSelector requires props) ───────────
function MaestroPage() {
  return (
    <MaestroSelector
      category={"altro" as any}
      courseId=""
      lessonIndex={0}
      onSelect={() => {}}
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
      <Route path="/settings" element={<Wrap><SettingsPage /></Wrap>} />
      <Route path="/radio-debug" element={<Wrap><DebugPage /></Wrap>} />

      {/* V2 Routes */}
      <Route path="/courses" element={<Wrap><CoursePanel /></Wrap>} />
      <Route path="/maestro" element={<Wrap><MaestroPage /></Wrap>} />
      <Route path="/life-tutor" element={<Wrap><LifeTutorTab /></Wrap>} />
      <Route path="/free-voice" element={<Wrap><FreeVoiceTab /></Wrap>} />
      <Route path="/progress" element={<Wrap><ProgressDashboard /></Wrap>} />
      <Route path="/billing" element={<Wrap><BillingPanel /></Wrap>} />
      <Route path="/landing" element={<Wrap><LandingPage onLogin={() => {}} onRegister={() => {}} onGuest={() => {}} /></Wrap>} />
      <Route path="/privacy" element={<Wrap><PrivacyPolicy onClose={() => window.history.back()} /></Wrap>} />
      <Route path="/terms" element={<Wrap><TermsOfService onClose={() => window.history.back()} /></Wrap>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/radio-chat" replace />} />
    </Routes>
  );
}
