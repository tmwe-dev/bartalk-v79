import { useState, useCallback } from 'react';
import { useT } from '../../lib/i18n';
import { useSettingsContext } from '../../context/SettingsContext';
import { useAgentContext } from '../../context/AgentContext';

import { LANGUAGES } from '../../types/settings';
import type { AppLanguage } from '../../types/settings';
import type { ConversationMode, TurnStrategy } from '../../types/conversation';
import { fetchAndSuggestVoices } from '../../lib/voiceSuggester';
import type { VoiceSuggestion } from '../../lib/voiceSuggester';
import { VoiceSuggestionModal } from './VoiceSuggestionModal';
import { saveLifeTutorConfig, loadLifeTutorConfig } from '../../lib/lifeTutorMemory';

// Raggruppa le lingue per categoria
const PRIMARY = LANGUAGES.filter(l => l.group === 'primary');
const MAJOR = LANGUAGES.filter(l => l.group === 'major');
const ELEVENLABS = LANGUAGES.filter(l => l.group === 'elevenlabs' || l.group === 'other');

export function PreferencesTab() {
  const t = useT();
  const {
    conversationMode, setConversationMode,
    turnStrategy, setTurnStrategy,
    ttsEnabled, setTtsEnabled,
    autoRun, setAutoRun,
    language, setLanguage,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    wordRange, setWordRange,
    getAPIKey,
    lifeTutorEnabled, setLifeTutorEnabled,
    webResourcesEnabled, setWebResourcesEnabled,
  } = useSettingsContext();
  const { enabledAgents, setCustomVoice } = useAgentContext();

  const [showMajor, setShowMajor] = useState(false);
  const [showElevenlabs, setShowElevenlabs] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [voiceSuggestions, setVoiceSuggestions] = useState<VoiceSuggestion[] | null>(null);
  const [suggestLang, setSuggestLang] = useState('');

  // Voice auto-suggest on language change
  const handleLanguageChange = useCallback(async (newLang: AppLanguage) => {
    setLanguage(newLang);

    // Check if ElevenLabs key exists — if so, suggest native voices
    const elevenLabsKey = getAPIKey('elevenlabs');
    if (!elevenLabsKey) return;

    const agentNames = enabledAgents.map(a => a.name);
    if (agentNames.length === 0) return;

    const suggestions = await fetchAndSuggestVoices(newLang, elevenLabsKey, agentNames);
    if (suggestions.length > 0) {
      setVoiceSuggestions(suggestions);
      setSuggestLang(newLang);
    }
  }, [setLanguage, getAPIKey, enabledAgents]);

  const handleAcceptVoices = useCallback((suggestions: VoiceSuggestion[]) => {
    for (const s of suggestions) {
      const agent = enabledAgents.find(a => a.name === s.agentName);
      if (agent) {
        setCustomVoice(agent.id, s.voiceId);
      }
    }
    setVoiceSuggestions(null);
  }, [enabledAgents, setCustomVoice]);

  // Life Tutor toggle handler
  const handleLifeTutorToggle = useCallback((enabled: boolean) => {
    setLifeTutorEnabled(enabled);
    const config = loadLifeTutorConfig();
    saveLifeTutorConfig({ ...config, enabled });
  }, [setLifeTutorEnabled]);

  // Controlla se la lingua attiva è in un gruppo non-primary
  const activeInMajor = MAJOR.some(l => l.value === language);
  const activeInElevenlabs = ELEVENLABS.some(l => l.value === language);

  // Filtra lingue per ricerca
  const filterLangs = (langs: typeof LANGUAGES) => {
    if (!langSearch.trim()) return langs;
    const q = langSearch.toLowerCase();
    return langs.filter(l =>
      l.label.toLowerCase().includes(q) ||
      l.value.toLowerCase().includes(q)
    );
  };

  const modes: { value: ConversationMode; label: string; desc: string; labelKey: string; descKey: string }[] = [
    { value: 'consultation', label: t('consultation'), desc: t('prefAllAgents'), labelKey: 'consultation', descKey: 'prefAllAgents' },
    { value: 'standard', label: t('standard'), desc: t('prefOneAgent'), labelKey: 'standard', descKey: 'prefOneAgent' },
    { value: 'bar_realtime', label: t('barRealtime'), desc: t('prefRadio'), labelKey: 'barRealtime', descKey: 'prefRadio' },
  ];

  const strategies: { value: TurnStrategy; label: string }[] = [
    { value: 'round_robin', label: t('turnRoundRobin') },
    { value: 'random', label: t('turnRandom') },
  ];

  const renderLangButton = (lang: typeof LANGUAGES[0]) => (
    <button
      key={lang.value}
      className={`lang-btn ${language === lang.value ? 'lang-active' : ''}`}
      onClick={() => handleLanguageChange(lang.value as AppLanguage)}
    >
      <span className="lang-flag">{lang.flag}</span>
      <span className="lang-name">{lang.label}</span>
    </button>
  );

  return (
    <div className="tab-content">

      {/* ── LINGUA ─────────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">{t('prefLanguage')}</label>

        {/* Lingue principali (sempre visibili) */}
        <div className="language-grid">
          {PRIMARY.map(renderLangButton)}
        </div>

        {/* Lingue Mondiali (espandibile) */}
        <button
          className={`lang-group-toggle ${showMajor || activeInMajor ? 'open' : ''}`}
          onClick={() => setShowMajor(!showMajor)}
        >
          <span className="lang-group-icon">{showMajor ? '▾' : '▸'}</span>
          <span>{t('prefWorldLanguages')} ({MAJOR.length})</span>
          {activeInMajor && (
            <span className="lang-group-active">
              {MAJOR.find(l => l.value === language)?.flag} {MAJOR.find(l => l.value === language)?.label}
            </span>
          )}
        </button>
        {(showMajor || activeInMajor) && (
          <div className="language-grid lang-grid-compact">
            {filterLangs(MAJOR).map(renderLangButton)}
          </div>
        )}

        {/* Lingue ElevenLabs (espandibile) */}
        <button
          className={`lang-group-toggle ${showElevenlabs || activeInElevenlabs ? 'open' : ''}`}
          onClick={() => setShowElevenlabs(!showElevenlabs)}
        >
          <span className="lang-group-icon">{showElevenlabs ? '▾' : '▸'}</span>
          <span>ElevenLabs TTS ({ELEVENLABS.length})</span>
          {activeInElevenlabs && (
            <span className="lang-group-active">
              {ELEVENLABS.find(l => l.value === language)?.flag} {ELEVENLABS.find(l => l.value === language)?.label}
            </span>
          )}
        </button>
        {(showElevenlabs || activeInElevenlabs) && (
          <>
            <input
              type="text"
              className="lang-search"
              placeholder={t('prefSearchLang')}
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
            />
            <div className="language-grid lang-grid-compact">
              {filterLangs(ELEVENLABS).map(renderLangButton)}
            </div>
          </>
        )}

        <p className="field-hint">
          {t('prefLangHint')}
        </p>
      </div>

      {/* ── MODALITÀ CONVERSAZIONE ─────────────────────── */}
      <div className="field-group">
        <label className="field-label">{t('prefConvMode')}</label>
        {modes.map(m => (
          <label key={m.value} className="radio-option">
            <input
              type="radio"
              name="mode"
              checked={conversationMode === m.value}
              onChange={() => setConversationMode(m.value)}
            />
            <span className="radio-label">{m.label}</span>
            <span className="radio-desc">{m.desc}</span>
          </label>
        ))}
        <p className="field-hint">
          {t('prefFirst4Turns')}
        </p>
      </div>

      {/* ── STRATEGIA TURNI ────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">{t('prefTurnStrategy')}</label>
        {strategies.map(s => (
          <label key={s.value} className="radio-option">
            <input
              type="radio"
              name="strategy"
              checked={turnStrategy === s.value}
              onChange={() => setTurnStrategy(s.value)}
            />
            <span className="radio-label">{s.label}</span>
          </label>
        ))}
      </div>

      {/* ── TTS ────────────────────────────────────────── */}
      <div className="field-group">
        <label className="radio-option">
          <input
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          <span className="radio-label">
            {ttsEnabled ? t('ttsOn') : t('ttsOff')}
          </span>
          <span className="radio-desc">
            {t('prefTtsLabel')}
          </span>
        </label>
      </div>

      {/* ── AUTO-RUN ─────────────────────────────────── */}
      <div className="field-group">
        <label className="radio-option">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
          />
          <span className="radio-label">
            {autoRun ? `🔄 ${t('prefAutoRun')}` : `⏸ ${t('prefAutoRunOff')}`}
          </span>
          <span className="radio-desc">
            {t('prefAutoRunDesc')}
          </span>
        </label>
      </div>

      {/* ── LIFE TUTOR ─────────────────────────────── */}
      <div className="field-group life-tutor-section">
        <label className="radio-option">
          <input
            type="checkbox"
            checked={lifeTutorEnabled}
            onChange={(e) => handleLifeTutorToggle(e.target.checked)}
          />
          <span className="radio-label">
            {lifeTutorEnabled ? '🧠 Life Tutor Attivo' : '🧠 Life Tutor'}
          </span>
          <span className="radio-desc">
            Attiva il maestro di vita: ricorda le tue conversazioni, i tuoi progressi, la tua vita.
            Crea una connessione profonda e personalizzata con ogni maestro e agente.
          </span>
        </label>
        {lifeTutorEnabled && (
          <div className="life-tutor-info">
            <p>Il Life Tutor analizza le conversazioni per ricordare:</p>
            <ul>
              <li>Fatti personali (famiglia, lavoro, interessi)</li>
              <li>Progressi nello studio e traguardi</li>
              <li>Emozioni e momenti importanti</li>
              <li>Obiettivi e sfide</li>
            </ul>
            <p className="life-tutor-note">
              Nota: usa token aggiuntivi per l'analisi delle conversazioni.
            </p>
          </div>
        )}
      </div>

      {/* ── RISORSE WEB / INTERNET ─────────────────────── */}
      <div className="field-group web-resources-section">
        <label className="radio-option">
          <input
            type="checkbox"
            checked={webResourcesEnabled}
            onChange={(e) => setWebResourcesEnabled(e.target.checked)}
          />
          <span className="radio-label">
            {webResourcesEnabled ? '🌐 Risorse Web Attive' : '🌐 Risorse Web'}
          </span>
          <span className="radio-desc">
            Permetti ai maestri e agenti di arricchire le risposte con link a YouTube, Wikipedia,
            immagini e risorse esterne per approfondire lo studio.
          </span>
        </label>
        {webResourcesEnabled && (
          <div className="web-resources-info">
            <p>Con le risorse web attive, i maestri potranno:</p>
            <ul>
              <li>Inserire link a video YouTube pertinenti</li>
              <li>Collegare articoli Wikipedia per approfondimenti</li>
              <li>Suggerire immagini e foto illustrative</li>
              <li>Fornire link a risorse educative esterne</li>
            </ul>
            <p className="web-resources-note">
              Nota: i link vengono generati dall'AI e potrebbero non essere sempre attivi.
            </p>
          </div>
        )}
      </div>

      {/* ── TEMPERATURA ────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          {t('prefTemperature')}: <strong>{temperature.toFixed(1)}</strong>
        </label>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>{t('prefPrecise')} (0)</span>
          <span>{t('prefCreative')} (1.5)</span>
        </div>
        <p className="field-hint">
          {t('prefTempHint')}
        </p>
      </div>

      {/* ── MAX TOKENS ─────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          {t('prefMaxTokens')}: <strong>{maxTokens}</strong>
        </label>
        <input
          type="range"
          min="256"
          max="4096"
          step="256"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          className="range-input"
        />
        <div className="range-labels">
          <span>{t('prefShort')} (256)</span>
          <span>{t('prefLong')} (4096)</span>
        </div>
      </div>

      {/* ── WORD RANGE ─────────────────────────────────── */}
      <div className="field-group">
        <label className="field-label">
          {t('prefWordsPerReply')}: <strong>{wordRange[0]}–{wordRange[1]}</strong>
        </label>
        <div className="dual-range">
          <div>
            <span className="range-sublabel">{t('prefRangeMin')}:</span>
            <input
              type="range"
              min="20"
              max="300"
              step="10"
              value={wordRange[0]}
              onChange={(e) => {
                const min = parseInt(e.target.value);
                setWordRange([min, Math.max(min + 20, wordRange[1])]);
              }}
              className="range-input"
            />
          </div>
          <div>
            <span className="range-sublabel">{t('prefRangeMax')}:</span>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={wordRange[1]}
              onChange={(e) => {
                const max = parseInt(e.target.value);
                setWordRange([Math.min(wordRange[0], max - 20), max]);
              }}
              className="range-input"
            />
          </div>
        </div>
      </div>

      <p className="field-hint auto-save-notice">
        {t('prefAutoSave')}
      </p>

      {/* Voice suggestion modal */}
      {voiceSuggestions && (
        <VoiceSuggestionModal
          suggestions={voiceSuggestions}
          targetLanguage={suggestLang}
          onAccept={handleAcceptVoices}
          onDismiss={() => setVoiceSuggestions(null)}
        />
      )}
    </div>
  );
}
