import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIContext } from '../../context/UIContext';
import { useAuthContext } from '../../context/AuthContext';
import { useConversationContext } from '../../context/ConversationContext';
import { useTTS } from '../../hooks/useTTS';
import { useThemeContext } from '../../context/ThemeContext';
import { UI } from '../../lib/constants';

/**
 * Sezioni navigabili via menu hamburger.
 * Le sezioni "core" (Chat) e funzionali (Podcast/Task/Studio)
 * sono gestite come tab nella ChatPage, non come route separate.
 */
/**
 * Complete navigation sections, grouped by category.
 * Includes all app areas reachable via hamburger menu.
 */
const NAV_SECTIONS = [
  // Core
  { path: '/radio-chat', label: 'Chat', icon: '💬', group: 'core' },
  // Learning
  { path: '/courses', label: 'Corsi', icon: '📚', group: 'learn' },
  { path: '/maestro', label: 'Maestro', icon: '🎓', group: 'learn' },
  { path: '/life-tutor', label: 'Life Tutor', icon: '🧠', group: 'learn' },
  // Tools
  { path: '/free-voice', label: 'Voce Libera', icon: '🎤', group: 'tools' },
  // Account
  { path: '/progress', label: 'Progressi', icon: '📊', group: 'account' },
  { path: '/billing', label: 'Abbonamento', icon: '💳', group: 'account' },
  { path: '/settings', label: 'Impostazioni', icon: '⚙️', group: 'account' },
] as const;

interface NavbarProps {
  /** Tab attiva nella ChatPage (chat/carousel/podcast/tasks/studio) */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  /** AutoRun toggle */
  autoRun?: boolean;
  onAutoRunToggle?: () => void;
  /** Sidebar toggle (ChatPage) */
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  /** Task badge */
  hasActiveTask?: boolean;
}

export function Navbar({
  activeTab,
  onTabChange,
  autoRun,
  onAutoRunToggle,
  onToggleSidebar,
  hasActiveTask,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSettings } = useUIContext();
  const { user, authState, isSkipMode, signOut, resumeAuth } = useAuthContext();
  const { newConversation, conversationTitle } = useConversationContext();
  const { stop: stopTTS } = useTTS();
  const { theme, toggleTheme } = useThemeContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (menuOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector<HTMLButtonElement>('.navbar-menu-item');
      firstItem?.focus();
    }
  }, [menuOpen]);

  // Arrow key navigation within menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('.navbar-menu-item');
    if (!items?.length) return;
    const current = document.activeElement as HTMLElement;
    const idx = Array.from(items).indexOf(current as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    }
  }, []);

  const handleNewChat = () => {
    stopTTS();
    newConversation();
  };

  const handleNavTo = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const isOnChat = location.pathname === '/radio-chat' || location.pathname === '/';

  return (
    <nav className="navbar" role="navigation" aria-label="Navigazione principale">
      {/* === LEFT: hamburger + brand === */}
      <div className="navbar-left">
        <button
          className="nav-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Menu sezioni"
          aria-label="Apri menu sezioni"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {/* Sidebar toggle (solo su ChatPage) */}
        {isOnChat && onToggleSidebar && (
          <button
            className="nav-btn"
            onClick={onToggleSidebar}
            title="Conversazioni"
            aria-label="Apri/chiudi sidebar conversazioni"
          >
            📋
          </button>
        )}

        <h1 className="navbar-title" onClick={() => navigate('/radio-chat')} style={{ cursor: 'pointer' }}>
          {UI.appName}
        </h1>
        <span className="navbar-version">v{UI.appVersion}</span>
        <span className="navbar-conv-title" aria-live="polite">{conversationTitle}</span>
      </div>

      {/* === CENTER: Tab funzionali (solo su ChatPage) === */}
      {isOnChat && onTabChange && (
        <div className="navbar-tabs" role="tablist" aria-label="Vista chat">
          {[
            { id: 'chat', icon: '💬', label: 'Chat' },
            { id: 'carousel', icon: '🎠', label: 'Carousel' },
            { id: 'podcast', icon: '🎙️', label: 'Podcast' },
            { id: 'tasks', icon: '🎯', label: 'Task' },
            { id: 'studio', icon: '🔧', label: 'Studio' },
          ].map(t => (
            <button
              key={t.id}
              className={`navbar-tab ${activeTab === t.id ? 'navbar-tab-active' : ''}`}
              onClick={() => onTabChange(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
              title={t.label}
            >
              <span className="navbar-tab-icon">{t.icon}</span>
              <span className="navbar-tab-label">{t.label}</span>
              {t.id === 'tasks' && hasActiveTask && <span className="navbar-task-badge" />}
            </button>
          ))}
          {onAutoRunToggle && (
            <button
              className={`navbar-tab ${autoRun ? 'navbar-tab-active' : ''}`}
              onClick={onAutoRunToggle}
              title={autoRun ? 'AutoRun ON' : 'AutoRun OFF'}
            >
              <span className="navbar-tab-icon">{autoRun ? '🔄' : '⏸'}</span>
              <span className="navbar-tab-label">Auto</span>
            </button>
          )}
        </div>
      )}

      {/* === RIGHT: azioni rapide === */}
      <div className="navbar-right" role="toolbar" aria-label="Azioni rapide">
        <button className="nav-btn" onClick={handleNewChat} title="Nuova conversazione" aria-label="Nuova conversazione">
          ➕
        </button>
        <button className="nav-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'} aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="nav-btn" onClick={toggleSettings} title="Impostazioni (Ctrl+K)" aria-label="Apri impostazioni">
          ⚙️
        </button>

        {/* Auth */}
        {authState === 'authenticated' && user ? (
          <button className="nav-btn" onClick={signOut} title={`${user.email} — Esci`} aria-label={`Esci da ${user.email}`}>
            👤
          </button>
        ) : isSkipMode ? (
          <button className="nav-btn" onClick={resumeAuth} title="Accedi con un account" aria-label="Accedi con un account">
            🔐
          </button>
        ) : null}
      </div>

      {/* === Dropdown navigation menu === */}
      {menuOpen && (
        <>
          <div className="navbar-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="navbar-menu" role="menu" aria-label="Sezioni app" ref={menuRef} onKeyDown={handleMenuKeyDown}>
            {NAV_SECTIONS.map((s, i) => (
              <React.Fragment key={s.path}>
                {i > 0 && NAV_SECTIONS[i - 1].group !== s.group && (
                  <div className="navbar-menu-divider" role="separator" />
                )}
                <button
                  className={`navbar-menu-item ${location.pathname === s.path ? 'active' : ''}`}
                  role="menuitem"
                  onClick={() => handleNavTo(s.path)}
                >
                  <span className="navbar-menu-icon">{s.icon}</span>
                  {s.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}
