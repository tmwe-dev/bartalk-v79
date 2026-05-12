import { useNavigate } from 'react-router-dom';
import { useUIContext } from '../../context/UIContext';
import { useAuthContext } from '../../context/AuthContext';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTTS } from '../../hooks/useTTS';
import { useThemeContext } from '../../context/ThemeContext';
import { UI } from '../../lib/constants';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function Navbar({ onToggleSidebar, sidebarCollapsed }: NavbarProps) {
  const navigate = useNavigate();
  const { setStudioMode, studioMode } = useUIContext();
  const { user, authState, isSkipMode, signOut, resumeAuth } = useAuthContext();
  const { newConversation, conversationTitle } = useConversationContext();
  const { ttsEnabled, setTtsEnabled } = useSettingsContext();
  const { stop: stopTTS } = useTTS();
  const { theme, toggleTheme } = useThemeContext();

  const handleNewChat = () => {
    stopTTS();
    newConversation();
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Navigazione principale">
      <div className="navbar-left">
        {/* Hamburger: only show when sidebar is collapsed */}
        {sidebarCollapsed && onToggleSidebar && (
          <button
            className="nav-btn"
            onClick={onToggleSidebar}
            title="Apri sidebar"
            aria-label="Apri sidebar"
            aria-expanded={!sidebarCollapsed}
          >
            ☰
          </button>
        )}
        <h1 className="navbar-title">{UI.appName}</h1>
        <span className="navbar-version" aria-label={`Versione ${UI.appVersion}`}>v{UI.appVersion}</span>
        <span className="navbar-conv-title" aria-live="polite">{conversationTitle}</span>
      </div>

      <div className="navbar-right" role="toolbar" aria-label="Azioni rapide">
        <button
          className="nav-btn"
          onClick={handleNewChat}
          title="Nuova conversazione"
          aria-label="Nuova conversazione"
        >
          ➕
        </button>
        <button
          className={`nav-btn ${ttsEnabled ? 'active' : ''}`}
          onClick={() => setTtsEnabled(!ttsEnabled)}
          title={ttsEnabled ? UI.ttsOn : UI.ttsOff}
          aria-label={ttsEnabled ? 'Disattiva voci' : 'Attiva voci'}
          aria-pressed={ttsEnabled}
        >
          {ttsEnabled ? '🔊' : '🔇'}
        </button>
        <button
          className="nav-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
          aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="nav-btn"
          onClick={() => navigate('/settings')}
          title="Impostazioni"
          aria-label="Apri impostazioni"
        >
          ⚙️
        </button>
        <button
          className={`nav-btn ${studioMode ? 'active' : ''}`}
          onClick={() => setStudioMode(!studioMode)}
          title={UI.studio}
          aria-label={studioMode ? 'Chiudi studio tecnico' : 'Apri studio tecnico'}
          aria-pressed={studioMode}
        >
          🔧
        </button>

        {/* Auth: mostra email utente o bottone accedi */}
        {authState === 'authenticated' && user ? (
          <button
            className="nav-btn"
            onClick={signOut}
            title={`${user.email} — Esci`}
            aria-label={`Esci da ${user.email}`}
          >
            👤
          </button>
        ) : isSkipMode ? (
          <button
            className="nav-btn"
            onClick={resumeAuth}
            title="Accedi con un account"
            aria-label="Accedi con un account"
          >
            🔐
          </button>
        ) : null}
      </div>
    </nav>
  );
}
