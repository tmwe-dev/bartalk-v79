import { useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { AgentProvider } from './context/AgentContext';
import { ConversationProvider } from './context/ConversationContext';
import { UIProvider, useUIContext } from './context/UIContext';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ToastContainer } from './components/Common/Toast';
import { ChatPage } from './pages/ChatPage';
import { StudioPage } from './components/Studio/StudioPage';
import { AppLayout } from './components/Layout/AppLayout';

function AppContent() {
  const { toggleSettings, studioMode } = useUIContext();

  // Ctrl+K per aprire impostazioni
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

  if (studioMode) {
    return (
      <AppLayout sidebar={false}>
        <StudioPage />
      </AppLayout>
    );
  }

  return <ChatPage />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AgentProvider>
        <ConversationProvider>
          <UIProvider>
            <AppContent />
            <SettingsModal />
            <ToastContainer />
          </UIProvider>
        </ConversationProvider>
      </AgentProvider>
    </SettingsProvider>
  );
}
