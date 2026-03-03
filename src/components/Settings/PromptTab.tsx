import { useState, useMemo, useCallback } from 'react';
import { AGENTS } from '../../lib/agents';
import {
  AGENT_PERSONALITIES,
  buildRichSystemPrompt,
} from '../../lib/prompts';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAgentContext } from '../../context/AgentContext';
import { ORCHESTRATOR } from '../../lib/constants';
import { LANGUAGES } from '../../types/settings';
import { callProxy } from '../../lib/proxy';
import { getAPIKey, getModel } from '../../lib/storage';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { AgentPersonality } from '../../lib/prompts';
import type { OrchestratorPlan } from '../../types/orchestrator';

// ── 5 Preset di personalità predefinite ──────────────────────────────

interface PersonalityPreset {
  id: string;
  icon: string;
  label: string;
  desc: string;
  personality: AgentPersonality;
}

const PRESETS: PersonalityPreset[] = [
  {
    id: 'scientist',
    icon: '🔬',
    label: 'Scienziato',
    desc: 'Analitico, basato su dati ed evidenze',
    personality: {
      role: 'Scienziato e Ricercatore',
      style: 'Analitico, rigoroso, basato su evidenze. Cita studi e dati quando possibile.',
      strengths: 'Metodo scientifico, analisi dei dati, ricerca, verifica delle fonti.',
      approach: 'Parti sempre da ipotesi verificabili. Usa il metodo scientifico. Distingui tra fatti, ipotesi e opinioni.',
      debateRule: 'Richiedi prove a supporto di ogni affermazione. Presenta controevidenze quando disponibili.',
    },
  },
  {
    id: 'philosopher',
    icon: '🏛️',
    label: 'Filosofo',
    desc: 'Riflessivo, etico, visione profonda',
    personality: {
      role: 'Filosofo e Pensatore Critico',
      style: 'Riflessivo, profondo, socratico. Pone domande più che dare risposte.',
      strengths: 'Etica, epistemologia, pensiero critico, analisi concettuale, argomentazione.',
      approach: 'Esplora le implicazioni morali e concettuali. Usa il metodo socratico. Cerca le premesse nascoste.',
      debateRule: 'Sfida i presupposti con domande. Cerca la radice filosofica di ogni disaccordo.',
    },
  },
  {
    id: 'strategist',
    icon: '♟️',
    label: 'Stratega',
    desc: 'Visionario, orientato agli obiettivi',
    personality: {
      role: 'Stratega e Visionario',
      style: 'Lungimirante, strategico, orientato ai risultati. Pensa in termini di scenari e opportunità.',
      strengths: 'Pianificazione strategica, analisi SWOT, trend, leadership, decision-making.',
      approach: 'Analizza ogni situazione in termini di rischi e opportunità. Proponi strategie a breve e lungo termine.',
      debateRule: 'Valuta ogni proposta in base al suo impatto strategico. Proponi alternative con analisi costi-benefici.',
    },
  },
  {
    id: 'creative',
    icon: '🎨',
    label: 'Creativo',
    desc: 'Innovativo, fuori dagli schemi',
    personality: {
      role: 'Creativo e Innovatore',
      style: 'Immaginativo, non convenzionale, provocatorio. Rompe gli schemi con analogie sorprendenti.',
      strengths: 'Pensiero laterale, brainstorming, storytelling, design thinking, innovazione.',
      approach: 'Cerca connessioni inaspettate. Usa metafore e analogie. Proponi soluzioni non convenzionali.',
      debateRule: 'Quando tutti concordano, gioca l\'avvocato del diavolo. Porta prospettive che nessuno ha considerato.',
    },
  },
  {
    id: 'pragmatist',
    icon: '🔧',
    label: 'Pragmatico',
    desc: 'Concreto, orientato all\'azione',
    personality: {
      role: 'Esperto Pratico e Realizzatore',
      style: 'Diretto, concreto, orientato all\'azione. Va dritto al punto con esempi reali.',
      strengths: 'Implementazione, problem-solving, esperienza pratica, efficienza, risultati.',
      approach: 'Rispondi con soluzioni concrete e passi d\'azione. Semplifica. Proponi cosa fare ora.',
      debateRule: 'Testa ogni teoria con casi reali. Porta controesempi pratici quando le idee sono troppo astratte.',
    },
  },
];

// ── Componente principale ────────────────────────────────────────────

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

  // Clone persona state
  const [cloneQuery, setCloneQuery] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneError, setCloneError] = useState('');

  const { language, temperature, maxTokens, wordRange, conversationMode } = useSettingsContext();
  const { isAgentEnabled } = useAgentContext();

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];
  const personality = customPersonalities[selectedAgent] || AGENT_PERSONALITIES[selectedAgent];
  const langConfig = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];

  const toggleSection = (s: PromptSection) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  // Salva personalità
  const applyPersonality = useCallback((p: AgentPersonality) => {
    const updated = {
      ...customPersonalities,
      [selectedAgent]: p,
    };
    setCustomPersonalities(updated);
    localStorage.setItem('bartalk_custom_personalities', JSON.stringify(updated));
  }, [customPersonalities, selectedAgent]);

  const savePersonality = (field: keyof AgentPersonality, value: string) => {
    applyPersonality({ ...personality, [field]: value });
  };

  const resetPersonality = () => {
    const updated = { ...customPersonalities };
    delete updated[selectedAgent];
    setCustomPersonalities(updated);
    localStorage.setItem('bartalk_custom_personalities', JSON.stringify(updated));
  };

  const applyPreset = (preset: PersonalityPreset) => {
    applyPersonality({ ...preset.personality });
  };

  // ── Clona personalità da personaggio storico (AI search) ───────────
  const clonePersonality = useCallback(async () => {
    if (!cloneQuery.trim()) return;
    setCloneLoading(true);
    setCloneError('');

    const providers = ['openai', 'anthropic', 'gemini', 'groq'] as const;
    let apiKey = '';
    let provider: typeof providers[number] = 'openai';
    for (const p of providers) {
      const key = getAPIKey(p);
      if (key) { apiKey = key; provider = p; break; }
    }

    if (!apiKey) {
      setCloneError('Nessuna chiave API disponibile. Configura almeno una chiave.');
      setCloneLoading(false);
      return;
    }

    const model = getModel(provider) || DEFAULT_MODELS[provider];

    const systemPrompt = `Sei un esperto di personalità storiche e contemporanee. Analizza la persona richiesta e crea un profilo personalità per un agente AI che parteciperà a dibattiti.

RISPONDI ESCLUSIVAMENTE in formato JSON valido, senza markdown, senza backtick, senza testo extra. Solo il JSON.

Il JSON deve avere esattamente questi 5 campi (in italiano):
{
  "role": "Il ruolo/titolo che meglio descrive questa persona (max 8 parole)",
  "style": "Lo stile comunicativo caratteristico (max 30 parole)",
  "strengths": "I punti di forza intellettuali e comunicativi (max 25 parole)",
  "approach": "Come questa persona affronta un dibattito o una discussione (max 40 parole)",
  "debateRule": "La regola principale che segue quando è in disaccordo (max 30 parole)"
}

Basa il profilo sulle caratteristiche REALI della persona: modo di parlare, pensare, argomentare, idee caratteristiche, temperamento.`;

    try {
      const result = await callProxy({
        provider,
        model,
        messages: [
          { role: 'user', content: `Crea il profilo personalità di: ${cloneQuery.trim()}` },
        ],
        systemPrompt,
        temperature: 0.7,
        maxTokens: 500,
        apiKey,
      });

      if (result.error) {
        setCloneError(`Errore API: ${result.error}`);
        setCloneLoading(false);
        return;
      }

      let jsonStr = result.content.trim();
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        setCloneError('Risposta non valida. Riprova.');
        setCloneLoading(false);
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.role || !parsed.style || !parsed.strengths || !parsed.approach || !parsed.debateRule) {
        setCloneError('Profilo incompleto. Riprova.');
        setCloneLoading(false);
        return;
      }

      applyPersonality(parsed as AgentPersonality);
      setCloneQuery('');
    } catch (err) {
      setCloneError(`Errore: ${(err as Error).message}`);
    }

    setCloneLoading(false);
  }, [cloneQuery, applyPersonality]);

  const isCustom = !!customPersonalities[selectedAgent];

  // Anteprima prompt finale
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent, language, temperature, maxTokens, wordRange, conversationMode, agent, customPersonalities]);

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
        <span className="prompt-status-stats">{promptLines} righe · {promptChars} car</span>
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

            {/* ── Preset rapidi ──────────────────────────── */}
            <div className="prompt-presets">
              <span className="prompt-presets-label">Preset rapidi:</span>
              <div className="prompt-presets-grid">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    className="prompt-preset-btn"
                    onClick={() => applyPreset(p)}
                    title={p.desc}
                  >
                    <span className="prompt-preset-icon">{p.icon}</span>
                    <span className="prompt-preset-name">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Clona personalità con AI ────────────────── */}
            <div className="prompt-clone">
              <span className="prompt-clone-label">Clona personalità di...</span>
              <div className="prompt-clone-row">
                <input
                  className="prompt-clone-input"
                  type="text"
                  value={cloneQuery}
                  onChange={(e) => setCloneQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && clonePersonality()}
                  placeholder="Es: Einstein, Steve Jobs, Socrate, Trump..."
                  disabled={cloneLoading}
                />
                <button
                  className="prompt-clone-btn"
                  onClick={clonePersonality}
                  disabled={cloneLoading || !cloneQuery.trim()}
                >
                  {cloneLoading ? '⏳' : '🔍'} {cloneLoading ? 'Ricerca...' : 'Genera'}
                </button>
              </div>
              {cloneError && <div className="prompt-clone-error">{cloneError}</div>}
              <p className="prompt-clone-hint">
                L'AI analizzerà il personaggio e creerà un profilo personalità basato sulle sue caratteristiche reali.
              </p>
            </div>

            {/* ── Edit / Reset ───────────────────────────── */}
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

            {/* ── Campi personalità ──────────────────────── */}
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
              Regole del dibattito in <strong>{langConfig.label}</strong>.
              Cambia lingua nelle Preferenze.
            </p>
            <div className="prompt-debate-preview">
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Introduzione</span>
                <span className="prompt-debate-text">Contesto conversazione multi-voce BarTalk</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Regole</span>
                <span className="prompt-debate-text">6 regole: ascolto, valore nuovo, approfondimento, dissenso argomentato, collaborazione, convergenza</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Consultazione</span>
                <span className="prompt-debate-text">Coordinamento risposte tra agenti + contesto precedenti</span>
              </div>
              <div className="prompt-debate-block">
                <span className="prompt-debate-label">Convergenza</span>
                <span className="prompt-debate-text">Dinamica: stagnazione → novità / accordo → approfondimento / divergenza → sintesi</span>
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
                  <span className="prompt-param-hint"> (mode)</span>
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
                  }
                </span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">History</span>
                <span className="prompt-param-value">
                  {ORCHESTRATOR.historySlice[conversationMode as keyof typeof ORCHESTRATOR.historySlice] ?? 10} msg
                </span>
              </div>
              <div className="prompt-param">
                <span className="prompt-param-label">Turni forzati</span>
                <span className="prompt-param-value">{ORCHESTRATOR.forcedConsultationTurns} consultazione</span>
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
              System prompt inviato a <strong>{agent.name}</strong> ({agent.provider}).
              In consultazione include anche le risposte precedenti.
            </p>
            <pre className="prompt-preview-code">{previewPrompt}</pre>
          </div>
        )}
      </div>

    </div>
  );
}
