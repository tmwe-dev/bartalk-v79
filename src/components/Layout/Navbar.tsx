import { useUIContext } from '../../context/UIContext';
import { useAuthContext } from '../../context/AuthContext';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTTS } from '../../hooks/useTTS';
import { UI } from '../../lib/constants';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function Navbar({ onToggleSidebar, sidebarCollapsed }: NavbarProps) {
  const { toggleSettings, setStudioMode, studioMode } = useUIContext();
  const { user, authState, isSkipMode, signOut, resumeAuth } = useAuthContext();
  const { newConversation, conversationTitle } = useConversationContext();
  const { ttsEnabled, setTtsEnabled } = useSettingsContext();
  const { stop: stopTTS } = useTTS();

  const handleNewChat = () => {
    stopTTS();
    newConversation();
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Hamburger: only show when sidebar is collapsed */}
        {sidebarCollapsed && onToggleSidebar && (
          <button
            className="nav-btn"
            onClick={onToggleSidebar}
            title="Apri sidebar"
          >
            ☰
          </button>
        )}
        <h1 className="navbar-title">{UI.appName}</h1>
        <span className="navbar-version">v{UI.appVersion}</span>
        <span className="navbar-conv-title">{conversationTitle}</span>
      </div>

      <div className="navbar-right">
        <button
          className="nav-btn"
          onClick={handleNewChat}
          title="Nuova conversazione"
        >
          ➕
        </button>
        <button
          className={`nav-btn ${ttsEnabled ? 'active' : ''}`}
          onClick={() => setTtsEnabled(!ttsEnabled)}
          title={ttsEnabled ? UI.ttsOn : UI.ttsOff}
        >
          {ttsEnabled ? '🔊' : '🔇'}
        </button>
        <button
          className="nav-btn"
          onClick={toggleSettings}
          title="Impostazioni (Ctrl+K)"
        >
          ⚙️
        </button>
        <button
          className={`nav-btn ${studioMode ? 'active' : ''}`}
          onClick={() => setStudioMode(!studioMode)}
          title={UI.studio}
        >
          🔧
        </button>

        {/* Auth: mostra email utente o bottone accedi */}
        {authState === 'authenticated' && user ? (
          <button
            className="nav-btn"
            onClick={signOut}
            title={`${user.email} — Esci`}
          >
            👤
          </button>
        ) : isSkipMode ? (
          <button
            className="nav-btn"
            onClick={resumeAuth}
            title="Accedi con un account"
          >
            🔐
          </button>
        ) : null}
      </div>
    </nav>
  );
}
