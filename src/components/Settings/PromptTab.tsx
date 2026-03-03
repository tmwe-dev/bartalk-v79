import { useState, useMemo } from 'react';
import { AGENTS } from '../../lib/agents';
import {
  AGENT_PERSONALITIES,
  buildRichSystemPrompt,
} from '../../lib/prompts';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAgentContext } from '../../context/AgentContext';
import { ORCHESTRATOR } from '../../lib/constants';
import { LANGUAGES } from '../../types/settings';
import type { AgentPersonality } from '../../lib/prompts';
import type { OrchestratorPlan } from '../../types/orchestrator';

/**
 * PromptTab — Pannello gestione prompt
 *
 * Mostra le sezioni del prompt per ogni agente:
 * - Personalità (ruolo, stile, punti di forza, approccio, regola dibattito)
 * - Framework dibattito
 * - Parametri attivi (lingua, temperature, word range, modalità)
 * - Anteprima del prompt finale assemblato
 */

type PromptSection = 'personality' | 'debate' | 'params' | 'preview';

export function PromptTab() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].id);
  const [expandedSections, setExpandedSections] = useState<Set<PromptSection>>(
    new Set(['personality', 'debate', 'params', 'preview'])
  );
  const [editMode, setEditMode] = useState(false);
  const [customPersonalities, setCustomPersonalities] = useState<Record<string, AgentPersonality>>(() => {
    try {
      const saved = localStorage.getItem('bartalk_custom_personalities');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const { language, temperature, maxTokens, wordRange, conversationMode } = useSettingsContext();
  const { isAgentEnabled } = useAgentContext();

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];
  const personality = customPersonalities[selectedAgent] || AGENT_PERSONALITIES[selectedAgent];
  const langConfig = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];

  // Toggle sezione
  const toggleSection = (s: PromptSection) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  // Salva personalità custom
  const savePersonality = (field: keyof AgentPersonality, value: string) => {
    const updated = {
      ...customPersonalities,
      [selectedAgent]: {
        ...personality,
        [field]: value,
      },
    };
    setCustomPersonalities(updated);
    localStorage.setItem('bartalk_custom_personalities', JSON.stringify(updated));
  };

  // Reset al default
  const resetPersonality = () => {
    const updated = { ...customPersonalities };
    delete updated[selectedAgent];
    setCustomPersonalities(updated);
    localStorage.setItem('bartalk_custom_personalities', JSON.stringify(updated));
  };

  const isCustom = !!customPersonalities[selectedAgent];

  // Anteprima prompt finale assemblato
  const previewPrompt = useMemo(() => {
    const modeKey = conversationMode as keyof typeof ORCHESTRATOR.temperatureByMode;
    const effectiveTemp = ORCHESTRATOR.temperatureByMode[modeKey] ?? temperature;
    const effectiveWordRange: [number, number] = conversationMode === 'consultation'
      ? [...ORCHESTRATOR.consultationWordRange] as [number, number]
      : wordRange;

    const mockPlan: OrchestratorPlan = {
      mode: conversationMode,
      agentsToSpeak: [agent],
      systemPrompts: new Map(),
      convergence: 'neutral',
      temperature: effectiveTemp,
      maxTokens,
      wordRange: effectiveWordRange,
      isForced: false,
      language,
    };

    return buildRichSystemPrompt(agent, [], '', mockPlan);
  }, [selectedAgent, language, temperature, maxTokens, wordRange, conversationMode, agent]);

  // Conteggio sezioni nel prompt finale
  const promptLines = previewPrompt.split('\n').length;
  const promptChars = previewPrompt.length;

  return (
    <div className="tab-content prompt-tab">

      {/* ── Selettore Agente ──────────────────────────── */}
      <div className="prompt-agent-selector">
        {AGENTS.map(a => (
          <button
            key={a.id}
            className={`prompt-agent-btn ${a.id === selectedAgent ? 'active' : ''} ${!isAgentEnabled(a.id) ? 'disabled-agent' : ''}`}
            onClick={() => setSelectedAgent(a.id)}
            style={{ '--agent-color': a.color } as React.CSSProperties}
          >
            <img src={a.staticImage} alt={a.name} className="prompt-agent-img" />
            <span>{a.name}</span>
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div className="prompt-status">
        <span className="prompt-status-badge">{agent.emoji} {agent.name}</span>
        <span className="prompt-status-provider">{agent.provider}</span>
        {isCustom && <span className="prompt-status-custom">Personalizzato</span>}
        <span className="prompt-status-stats">{promptLines} righe · {promptChars} caratteri</span>
      </div>

      {/* ── 1. PERSONALITÀ ────────────────────────────── */}
      <div className="prompt-section">
        <button className="prompt-section-header" onClick={() => toggleSection('personality')}>
          <span className="prompt-section-arrow">{expandedSections.has('personality') ? '▼' : '▶'}</span>
          <span className="prompt-section-title">1. Personalità Agente</span>
          <span className="prompt-section-badge">{personality.role}</span>
        </button>
        {expandedSections.has('personality') && (
          <div className="prompt-section-body">
            <div className="prompt-edit-toggle">
              <button
                className={`prompt-edit-btn ${editMode ? 'active' : ''}`}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? '✓ Salva' : '✏️ Modifica'}
              </button>
              {isCustom && (
                <button className="prompt-reset-btn" onClick={resetPersonality}>
                  ↺ Reset default
                </button>
              )}
            </div>

            {(['role', 'style', 'strengths', 'approach', 'debateRule'] as const).map(field => (
              <div key={field} className="prompt-field">
                <label className="prompt-field-label">
                  {field === 'role' ? 'RUOLO' :
                   field === 'style' ? 'STILE' :
                   field === 'strengths' ? 'PUNTI DI FORZA' :
                   field === 'approach' ? 'APPROCCIO' :
                   'REGOLA DIBATTITO'}
                </label>
                {editMode ? (
                  <textarea
                    className="prompt-field-input"
                    value={personality[field]}
                    onChange={(e) => savePersonality(field, e.target.value)}
                    rows={field === 'approach' || field === 'debateRule' ? 3 : 2}
                  />
                ) : (
                  <div className="prompt-field-value">{personality[field]}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. FRAMEWORK DIBATTITO ────────────────────── */}
      <div className="prompt-section">
        <button className="prompt-section-header" onClick={() => toggleSection('debate')}>
          <span className="prompt-section-arrow">{expandedSections.has('debate') ? '▼' : '▶'}</span>
          <span className="prompt-section-title">2. Framework Dibattito</span>
          <span className="prompt-section-badge">{langConfig.flag} {langConfig.label}</span>
        </button>
        {expandedSections.has('debate') && (
          <div className="prompt-section-body">
            <p className="prompt-info">
              Le regole del dibattito sono in <strong>{langConfig.label}</strong>.
              Cambia lingua nelle Preferenze.
            </p>
            <div className="prompt-debate-preview">
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Introduzione</span>
                <span className="prompt-debate-text">{langConfig.value === 'it' ? 'Sei in una conversazione a più voci nel BarTalk RadioChat...' : 'Multi-voice conversation context...'}</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Regole</span>
                <span className="prompt-debate-text">6 regole: ascolto, valore nuovo, approfondimento, dissenso argomentato, tono collaborativo, convergenza</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Consultazione</span>
                <span className="prompt-debate-text">Istruzioni per coordinare le risposte tra agenti</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Convergenza</span>
                <span className="prompt-debate-text">Istruzioni dinamiche basate su stato: stagnazione / accordo / divergenza</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. PARAMETRI ATTIVI ───────────────────────── */}
      <div className="prompt-section">
        <button className="prompt-section-header" onClick={() => toggleSection('params')}>
          <span className="prompt-section-arrow">{expandedSections.has('params') ? '▼' : '▶'}</span>
          <span className="prompt-section-title">3. Parametri Attivi</span>
          <span className="prompt-section-badge">{conversationMode}</span>
        </button>
        {expandedSections.has('params') && (
          <div className="prompt-section-body">
            <div className="prompt-params-grid">
              <div className="prompt-param">
                <span className="prompt-param-label">Modalità</span>
                <span className="prompt-param-value">{conversationMode}</span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Lingua</span>
                <span className="prompt-param-value">{langConfig.flag} {langConfig.label}</span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Temperature</span>
                <span className="prompt-param-value">
                  {(ORCHESTRATOR.temperatureByMode[conversationMode as keyof typeof ORCHESTRATOR.temperatureByMode] ?? temperature).toFixed(1)}
                  <span className="prompt-param-hint"> (mode default)</span>
                </span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Max Tokens</span>
                <span className="prompt-param-value">{maxTokens}</span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Word Range</span>
                <span className="prompt-param-value">
                  {conversationMode === 'consultation'
                    ? `${ORCHESTRATOR.consultationWordRange[0]}–${ORCHESTRATOR.consultationWordRange[1]}`
                    : `${wordRange[0]}–${wordRange[1]}`
                  } parole
                </span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">History</span>
                <span className="prompt-param-value">
                  {ORCHESTRATOR.historySlice[conversationMode as keyof typeof ORCHESTRATOR.historySlice] ?? 10} messaggi
                </span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Turni forzati</span>
                <span className="prompt-param-value">Primi {ORCHESTRATOR.forcedConsultationTurns} = consultazione</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. ANTEPRIMA PROMPT FINALE ────────────────── */}
      <div className="prompt-section">
        <button className="prompt-section-header" onClick={() => toggleSection('preview')}>
          <span className="prompt-section-arrow">{expandedSections.has('preview') ? '▼' : '▶'}</span>
          <span className="prompt-section-title">4. Prompt Finale Assemblato</span>
          <span className="prompt-section-badge">{promptLines} righe</span>
        </button>
        {expandedSections.has('preview') && (
          <div className="prompt-section-body">
            <p className="prompt-info">
              Questo è il system prompt che viene inviato a <strong>{agent.name}</strong> ({agent.provider}).
              In modalità consultazione include anche le risposte precedenti degli altri agenti.
            </p>
            <pre className="prompt-preview-code">{previewPrompt}</pre>
          </div>
        )}
      </div>

    </div>
  );
}
