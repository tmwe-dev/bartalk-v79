/**
 * BarTalk v8.2.6 — App Root
 * BrowserRouter wraps everything so all children can use useNavigate.
 * Context providers sit between BrowserRouter and Routes.
 */

import { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AgentProvider } from './context/AgentContext';
import { ConversationProvider } from './context/ConversationContext';
import { TaskProvider } from './context/TaskContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { BillingProvider } from './context/BillingContext';
import { XAPIProvider } from './context/xAPIContext';
import { LTIProvider } from './context/LTIContext';
import { CourseProvider } from './context/CourseContext';
import { MaestroProvider } from './context/MaestroContext';
import { ToastContainer } from './components/Common/Toast';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { AppRoutes } from './router';

/** Ctrl+K → navigates to /settings page */
function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <AgentProvider>
              <ConversationProvider>
                <TaskProvider>
                  <BillingProvider>
                    <XAPIProvider>
                      <LTIProvider>
                        <CourseProvider>
                          <MaestroProvider>
                            <UIProvider>
                              <ErrorBoundary>
                                <AppRoutes />
                              </ErrorBoundary>
                              <ToastContainer />
                              <KeyboardShortcuts />
                            </UIProvider>
                          </MaestroProvider>
                        </CourseProvider>
                      </LTIProvider>
                    </XAPIProvider>
                  </BillingProvider>
                </TaskProvider>
              </ConversationProvider>
            </AgentProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
