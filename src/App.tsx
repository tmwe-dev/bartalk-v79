/**
 * BarTalk v8.2 — App Root
 * BrowserRouter wraps everything so all children can use useNavigate.
 * Context providers sit between BrowserRouter and Routes.
 */

import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { AgentProvider } from './context/AgentContext';
import { ConversationProvider } from './context/ConversationContext';
import { TaskProvider } from './context/TaskContext';
import { UIProvider, useUIContext } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ToastContainer } from './components/Common/Toast';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { AppRoutes } from './router';

function KeyboardShortcuts() {
  const { toggleSettings } = useUIContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSettings]);

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
                  <UIProvider>
                    <ErrorBoundary>
                      <AppRoutes />
                    </ErrorBoundary>
                    <SettingsModal />
                    <ToastContainer />
                    <KeyboardShortcuts />
                  </UIProvider>
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
