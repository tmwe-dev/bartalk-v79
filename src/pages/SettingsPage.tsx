/**
 * BarTalk v8.2.6 — Settings Page (unified, full page)
 * Rotta: /settings
 * Unica interfaccia settings — SettingsModal rimossa.
 * Tutte le impostazioni passano da qui: generali, agenti, prompt/AI, account, avanzate.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentContext } from '../context/AgentContext';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { UI } from '../lib/constants';
import './SettingsPage.css';

// Lazy-loaded settings sub-tabs
const PreferencesTab = lazy(() => import('../components/Settings/PreferencesTab').then(m => ({ default: m.PreferencesTab })));
const PromptTab = lazy(() => import('../components/Settings/PromptTab').then(m => ({ default: m.PromptTab })));
const PromptSectionsTab = lazy(() => import('../components/Settings/PromptSectionsTab').then(m => ({ default: m.PromptSectionsTab })));
const MemoryTab = lazy(() => import('../components/Settings/MemoryTab').then(m => ({ default: m.MemoryTab })));
const VoicesTab = lazy(() => import('../components/Settings/VoicesTab').then(m => ({ default: m.VoicesTab })));

type SettingsTab = 'general' | 'agents' | 'prompts' | 'api' | 'account' | 'advanced';

export function SettingsPage() {
  const navigate = useNavigate();
  const { agents, toggleAgent, isAgentEnabled } = useAgentContext();
  const { user, authState, signOut, isSkipMode, resumeAuth } = useAuthContext();
  const { theme, toggleTheme } = useThemeContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simula caricamento dati (in futuro: fetch profilo dal DB)
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'Generale', icon: '⚙️' },
    { id: 'agents', label: 'Agenti', icon: '🤖' },
    { id: 'prompts', label: 'Prompt & AI', icon: '🧠' },
    { id: 'api', label: 'API Keys', icon: '🔑' },
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'advanced', label: 'Avanzate', icon: '🔧' },
  ];

  return (
    <div className="settings-page" role="main" aria-label="Impostazioni BarTalk">
      <a href="#settings-content" className="sr-only focus-visible">Salta al contenuto</a>
      <div className="settings-page-header">
        <h1 className="settings-page-title">Impostazioni</h1>
      </div>

      <div className="settings-page-layout">
        {/* Sidebar tabs */}
        <nav className="settings-sidebar" aria-label="Sezioni impostazioni" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
            >
              <span className="settings-sidebar-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content" id="settings-content">
          {isLoading ? (
            <div className="settings-loading" role="status" aria-label="Caricamento impostazioni">
              <div className="settings-spinner" />
              <span>Caricamento impostazioni...</span>
            </div>
          ) : (<>

          {/* ── General (unified: PreferencesTab + theme) ── */}
          {activeTab === 'general' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general">
              <h2>Generale</h2>

              <div className="settings-group">
                <h3>Tema</h3>
                <label className="settings-toggle">
                  <span>{theme === 'dark' ? 'Tema scuro' : 'Tema chiaro'}</span>
                  <input
                    type="checkbox"
                    checked={theme === 'light'}
                    onChange={toggleTheme}
                    aria-label="Attiva/disattiva tema chiaro"
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <Suspense fallback={<div className="settings-loading"><div className="settings-spinner" /></div>}>
                <PreferencesTab />
              </Suspense>
            </div>
          )}

          {/* ── Agents ── */}
          {activeTab === 'agents' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-agents" aria-labelledby="settings-tab-agents">
              <h2>Agenti AI</h2>
              <p className="settings-muted">Attiva o disattiva gli agenti che partecipano alla conversazione.</p>

              <div className="settings-agents-grid">
                {agents.map(agent => (
                  <div key={agent.id} className="settings-agent-card">
                    <div className="settings-agent-header">
                      <span className="settings-agent-emoji">{agent.emoji || '🤖'}</span>
                      <span className="settings-agent-name" style={{ color: agent.color }}>{agent.name}</span>
                    </div>
                    <div className="settings-agent-model">{agent.provider} · {agent.defaultModel}</div>
                    <label className="settings-toggle">
                      <span>Attivo</span>
                      <input
                        type="checkbox"
                        checked={isAgentEnabled(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Prompt & AI ── */}
          {activeTab === 'prompts' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-prompts" aria-labelledby="settings-tab-prompts">
              <h2>Prompt & AI</h2>
              <p className="settings-muted">Configura i prompt personalizzati, le sezioni di contesto, la memoria e le voci degli agenti.</p>
              <Suspense fallback={<div className="settings-loading"><div className="settings-spinner" /></div>}>
                <div className="settings-group">
                  <h3>Prompt personalizzato</h3>
                  <PromptTab />
                </div>
                <div className="settings-group">
                  <h3>Sezioni prompt</h3>
                  <PromptSectionsTab />
                </div>
                <div className="settings-group">
                  <h3>Memoria conversazioni</h3>
                  <MemoryTab />
                </div>
                <div className="settings-group">
                  <h3>Voci agenti</h3>
                  <VoicesTab />
                </div>
              </Suspense>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeTab === 'api' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-api" aria-labelledby="settings-tab-api">
              <h2>API Keys</h2>
              <p className="settings-muted">
                Le chiavi API sono gestite lato server tramite variabili d'ambiente Vercel.
                Non è necessario inserirle qui.
              </p>
              <div className="settings-info-box">
                <strong>🔒 Sicurezza</strong>
                <p>Le chiavi API non vengono mai esposte al client. Il proxy serverless le gestisce in modo sicuro.</p>
              </div>
            </div>
          )}

          {/* ── Account ── */}
          {activeTab === 'account' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-account" aria-labelledby="settings-tab-account">
              <h2>Account</h2>

              {authState === 'authenticated' && user ? (
                <div className="settings-group">
                  <div className="settings-account-info">
                    <div className="settings-account-avatar">👤</div>
                    <div>
                      <div className="settings-account-email">{user.email}</div>
                      {user.displayName && <div className="settings-account-name">{user.displayName}</div>}
                    </div>
                  </div>
                  <div className="settings-account-plan">
                    <span>Piano attuale:</span>
                    <strong>{localStorage.getItem('bartalk_selected_plan') === 'pro' ? 'Pro' : 'Free'}</strong>
                  </div>
                  <button className="settings-btn danger" onClick={signOut}>Esci dall'account</button>
                </div>
              ) : isSkipMode ? (
                <div className="settings-group">
                  <p className="settings-muted">Stai usando BarTalk senza account. I dati sono salvati solo nel browser.</p>
                  <button className="settings-btn primary" onClick={resumeAuth}>Crea un account</button>
                </div>
              ) : (
                <div className="settings-group">
                  <button className="settings-btn primary" onClick={() => navigate('/login')}>Accedi</button>
                </div>
              )}
            </div>
          )}

          {/* ── Advanced ── */}
          {activeTab === 'advanced' && (
            <div className="settings-section" role="tabpanel" id="settings-panel-advanced" aria-labelledby="settings-tab-advanced">
              <h2>Avanzate</h2>

              <div className="settings-group">
                <h3>Debug</h3>
                <button className="settings-btn secondary" onClick={() => navigate('/radio-debug')}>
                  Apri Debug Console →
                </button>
              </div>

              <div className="settings-group">
                <h3>Reset</h3>
                <p className="settings-muted">Cancella tutti i dati locali (conversazioni, impostazioni, cache).</p>
                <button
                  className="settings-btn danger"
                  onClick={() => {
                    if (confirm('Sei sicuro? Questa azione è irreversibile.')) {
                      localStorage.clear();
                      window.location.href = '/welcome';
                    }
                  }}
                >
                  Reset completo
                </button>
              </div>

              <div className="settings-group">
                <h3>Info</h3>
                <div className="settings-info-grid">
                  <span>Versione</span><span>v{UI.appVersion}</span>
                  <span>Build</span><span>React 19 + Vite 7</span>
                  <span>Backend</span><span>Supabase + Vercel Serverless</span>
                </div>
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}
