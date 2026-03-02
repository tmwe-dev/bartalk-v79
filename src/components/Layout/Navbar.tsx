import { useUIContext } from '../../context/UIContext';
import { useConversationContext } from '../../context/ConversationContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useTTS } from '../../hooks/useTTS';
import { UI } from '../../lib/constants';

export function Navbar() {
  const { toggleSettings, setStudioMode, studioMode } = useUIContext();
  const { newConversation, sidebarOpen, setSidebarOpen, conversationTitle } = useConversationContext();
  const { ttsEnabled, setTtsEnabled } = useSettingsContext();
  const { stop: stopTTS } = useTTS();

  const handleNewChat = () => {
    stopTTS();
    newConversation();
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className={`nav-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Conversazioni"
        >
          ☰
        </button>
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
      </div>
    </nav>
  );
}
