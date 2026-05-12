/**
 * BarTalk v8.2 — Debug Page
 * Console di debug con BroadcastChannel cross-tab, log viewer, system info.
 * Rotta: /radio-debug
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentContext } from '../context/AgentContext';
import { useSettingsContext } from '../context/SettingsContext';
import { useAuthContext } from '../context/AuthContext';
import { UI } from '../lib/constants';
import './DebugPage.css';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
}

const BROADCAST_CHANNEL = 'bartalk-debug';
let logId = 0;

export function DebugPage() {
  const navigate = useNavigate();
  const { agents, isAgentEnabled } = useAgentContext();
  const { ttsEnabled } = useSettingsContext();
  const { user, authState, isSkipMode } = useAuthContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoscroll, setAutoscroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ── Add log entry ──
  const addLog = useCallback((level: LogEntry['level'], source: string, message: string) => {
    const entry: LogEntry = {
      id: ++logId,
      timestamp: new Date().toISOString().slice(11, 23),
      level,
      source,
      message,
    };
    setLogs(prev => [...prev.slice(-500), entry]); // Keep last 500
  }, []);

  // ── BroadcastChannel for cross-tab debug ──
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { level, source, message } = event.data;
        if (level && source && message) {
          addLog(level, `[TAB] ${source}`, message);
        }
      };

      addLog('info', 'debug', 'BroadcastChannel connesso — cross-tab debug attivo');

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      addLog('warn', 'debug', 'BroadcastChannel non supportato in questo browser');
    }
  }, [addLog]);

  // ── Intercept console for debug ──
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args: unknown[]) => {
      originalConsole.log(...args);
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      if (msg.startsWith('[')) {
        const match = msg.match(/^\[(\w+)\]\s*(.*)/s);
        if (match) {
          addLog('info', match[1], match[2]);
          return;
        }
      }
      addLog('debug', 'console', msg);
    };

    console.warn = (...args: unknown[]) => {
      originalConsole.warn(...args);
      addLog('warn', 'console', args.map(String).join(' '));
    };

    console.error = (...args: unknown[]) => {
      originalConsole.error(...args);
      addLog('error', 'console', args.map(String).join(' '));
    };

    addLog('info', 'debug', 'Console intercept attivo');

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [addLog]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (autoscroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoscroll]);

  // ── System info ──
  const systemInfo = {
    version: UI.appVersion,
    authState,
    user: user?.email || (isSkipMode ? 'skip-mode' : 'non autenticato'),
    agents: agents.map(a => `${a.name}(${isAgentEnabled(a.id) ? '✓' : '✗'})`).join(', '),
    tts: ttsEnabled ? 'ON' : 'OFF',
    plan: localStorage.getItem('bartalk_selected_plan') || 'free',
    onboarded: localStorage.getItem('bartalk_onboarding_completed') || 'no',
    userAgent: navigator.userAgent.slice(0, 80),
    memory: (performance as any).memory
      ? `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)}MB / ${Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)}MB`
      : 'N/A',
  };

  // ── Filtered logs ──
  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.level === filter);

  // ── Send test message to other tabs ──
  const sendBroadcast = () => {
    if (channelRef.current) {
      channelRef.current.postMessage({
        level: 'info',
        source: 'debug-page',
        message: `Test broadcast da debug page @ ${new Date().toLocaleTimeString()}`,
      });
      addLog('info', 'broadcast', 'Messaggio test inviato a tutte le tab');
    }
  };

  return (
    <div className="debug-page" role="main" aria-label="Debug console BarTalk">
      <a href="#debug-logs" className="sr-only focus-visible">Salta ai log</a>
      {/* Header */}
      <header className="debug-header">
        <button className="debug-back-btn" onClick={() => navigate('/radio-chat')} aria-label="Torna alla chat">
          ← Torna a BarTalk
        </button>
        <h1 className="debug-title">🔬 Radio Debug Console</h1>
        <span className="debug-version" aria-label={`Versione ${UI.appVersion}`}>v{UI.appVersion}</span>
      </header>

      <div className="debug-layout">
        {/* Left: System Info */}
        <aside className="debug-sidebar" aria-label="Informazioni sistema">
          <h3>Sistema</h3>
          <div className="debug-info-grid">
            {Object.entries(systemInfo).map(([key, value]) => (
              <div key={key} className="debug-info-row">
                <span className="debug-info-key">{key}</span>
                <span className="debug-info-value">{value}</span>
              </div>
            ))}
          </div>

          <h3>Azioni</h3>
          <div className="debug-actions" role="toolbar" aria-label="Azioni debug">
            <button className="debug-action-btn" onClick={sendBroadcast} aria-label="Invia broadcast test a tutte le tab">
              📡 Broadcast Test
            </button>
            <button className="debug-action-btn" onClick={() => {
              addLog('info', 'test', 'Test log entry');
              addLog('warn', 'test', 'Test warning');
              addLog('error', 'test', 'Test error');
            }} aria-label="Genera log di test">
              🧪 Test Logs
            </button>
            <button className="debug-action-btn" onClick={() => setLogs([])} aria-label="Pulisci tutti i log">
              🗑️ Pulisci Logs
            </button>
            <button className="debug-action-btn" onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `bartalk-debug-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }} aria-label="Esporta log come JSON">
              💾 Esporta Logs
            </button>
          </div>
        </aside>

        {/* Right: Logs */}
        <section className="debug-logs-panel" id="debug-logs" aria-label="Log viewer">
          <div className="debug-logs-toolbar">
            <div className="debug-filter-tabs" role="tablist" aria-label="Filtro livello log">
              {['all', 'info', 'warn', 'error', 'debug'].map(f => (
                <button
                  key={f}
                  className={`debug-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                  role="tab"
                  aria-selected={filter === f}
                  aria-label={`${f === 'all' ? 'Tutti' : f.toUpperCase()} (${f === 'all' ? logs.length : logs.filter(l => l.level === f).length} voci)`}
                >
                  {f === 'all' ? 'Tutti' : f.toUpperCase()} ({f === 'all' ? logs.length : logs.filter(l => l.level === f).length})
                </button>
              ))}
            </div>
            <label className="debug-autoscroll">
              <input
                type="checkbox"
                checked={autoscroll}
                onChange={e => setAutoscroll(e.target.checked)}
              />
              Auto-scroll
            </label>
          </div>

          <div className="debug-logs-container" role="log" aria-live="polite" aria-label={`${filteredLogs.length} voci di log`}>
            {filteredLogs.length === 0 && (
              <div className="debug-logs-empty" role="status">Nessun log da mostrare</div>
            )}
            {filteredLogs.map(log => (
              <div key={log.id} className={`debug-log-entry level-${log.level}`}>
                <span className="debug-log-time">{log.timestamp}</span>
                <span className={`debug-log-level ${log.level}`}>{log.level.toUpperCase()}</span>
                <span className="debug-log-source">{log.source}</span>
                <span className="debug-log-msg">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </section>
      </div>
    </div>
  );
}
