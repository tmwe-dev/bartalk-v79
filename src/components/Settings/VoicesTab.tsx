import { useState, useEffect } from 'react';
import { useAgentContext } from '../../context/AgentContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useT } from '../../lib/i18n';
import { AGENTS } from '../../lib/agents';
import { TTS } from '../../lib/constants';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

/* ── Mappa lingua → bandiera + nome ────────────────────────── */
const LANG_MAP: Record<string, { flag: string; name: string }> = {
  // Codici ISO (come restituiti dall'API ElevenLabs in labels.language)
  en:  { flag: '🇬🇧', name: 'Inglese' },
  it:  { flag: '🇮🇹', name: 'Italiano' },
  es:  { flag: '🇪🇸', name: 'Spagnolo' },
  fr:  { flag: '🇫🇷', name: 'Francese' },
  de:  { flag: '🇩🇪', name: 'Tedesco' },
  pt:  { flag: '🇵🇹', name: 'Portoghese' },
  nl:  { flag: '🇳🇱', name: 'Olandese' },
  pl:  { flag: '🇵🇱', name: 'Polacco' },
  sv:  { flag: '🇸🇪', name: 'Svedese' },
  no:  { flag: '🇳🇴', name: 'Norvegese' },
  da:  { flag: '🇩🇰', name: 'Danese' },
  fi:  { flag: '🇫🇮', name: 'Finlandese' },
  tr:  { flag: '🇹🇷', name: 'Turco' },
  ru:  { flag: '🇷🇺', name: 'Russo' },
  ja:  { flag: '🇯🇵', name: 'Giapponese' },
  ko:  { flag: '🇰🇷', name: 'Coreano' },
  zh:  { flag: '🇨🇳', name: 'Cinese' },
  ar:  { flag: '🇸🇦', name: 'Arabo' },
  hi:  { flag: '🇮🇳', name: 'Hindi' },
  cs:  { flag: '🇨🇿', name: 'Ceco' },
  ro:  { flag: '🇷🇴', name: 'Rumeno' },
  el:  { flag: '🇬🇷', name: 'Greco' },
  hu:  { flag: '🇭🇺', name: 'Ungherese' },
  hr:  { flag: '🇭🇷', name: 'Croato' },
  id:  { flag: '🇮🇩', name: 'Indonesiano' },
  ms:  { flag: '🇲🇾', name: 'Malese' },
  ta:  { flag: '🇮🇳', name: 'Tamil' },
  fil: { flag: '🇵🇭', name: 'Filippino' },
  uk:  { flag: '🇺🇦', name: 'Ucraino' },
  vi:  { flag: '🇻🇳', name: 'Vietnamita' },
  th:  { flag: '🇹🇭', name: 'Thailandese' },
  bg:  { flag: '🇧🇬', name: 'Bulgaro' },
  sk:  { flag: '🇸🇰', name: 'Slovacco' },
  ca:  { flag: '🏴', name: 'Catalano' },
  // Nomi estesi
  italian:     { flag: '🇮🇹', name: 'Italiano' },
  english:     { flag: '🇬🇧', name: 'Inglese' },
  spanish:     { flag: '🇪🇸', name: 'Spagnolo' },
  french:      { flag: '🇫🇷', name: 'Francese' },
  german:      { flag: '🇩🇪', name: 'Tedesco' },
  portuguese:  { flag: '🇵🇹', name: 'Portoghese' },
  dutch:       { flag: '🇳🇱', name: 'Olandese' },
  polish:      { flag: '🇵🇱', name: 'Polacco' },
  russian:     { flag: '🇷🇺', name: 'Russo' },
  japanese:    { flag: '🇯🇵', name: 'Giapponese' },
  korean:      { flag: '🇰🇷', name: 'Coreano' },
  chinese:     { flag: '🇨🇳', name: 'Cinese' },
  arabic:      { flag: '🇸🇦', name: 'Arabo' },
  hindi:       { flag: '🇮🇳', name: 'Hindi' },
  // Accenti
  american:    { flag: '🇺🇸', name: 'Inglese (US)' },
  british:     { flag: '🇬🇧', name: 'Inglese (UK)' },
  australian:  { flag: '🇦🇺', name: 'Inglese (AU)' },
  irish:       { flag: '🇮🇪', name: 'Inglese (IE)' },
  indian:      { flag: '🇮🇳', name: 'Inglese (IN)' },
  scottish:    { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Inglese (Scozzese)' },
  african:     { flag: '🇿🇦', name: 'Inglese (ZA)' },
  'latin american': { flag: '🇲🇽', name: 'Spagnolo (LatAm)' },
  brazilian:   { flag: '🇧🇷', name: 'Portoghese (BR)' },
  multi:       { flag: '🌍', name: 'Multilingue' },
  multilingual: { flag: '🌍', name: 'Multilingue' },
};

function extractLanguages(voice: ElevenLabsVoice): { flag: string; name: string }[] {
  const found: { flag: string; name: string }[] = [];
  const seenFlags = new Set<string>();

  const tryAdd = (raw: string | undefined) => {
    if (!raw) return;
    const parts = raw.toLowerCase()
      .replace(/ and /g, ',')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      const match = LANG_MAP[part] || Object.entries(LANG_MAP).find(([k]) => part.includes(k))?.[1];
      if (match && !seenFlags.has(match.flag)) {
        seenFlags.add(match.flag);
        found.push(match);
      }
    }
  };

  if (voice.labels) {
    tryAdd(voice.labels.accent);
    tryAdd(voice.labels.language);
    tryAdd(voice.labels.description);
  }

  return found;
}

function getNonLanguageLabels(labels: Record<string, string>): string {
  const skipKeys = new Set(['accent', 'language']);
  return Object.entries(labels)
    .filter(([k]) => !skipKeys.has(k))
    .map(([, v]) => v)
    .join(', ');
}

function getLocalizedLangName(code: string, displayLocale: string): string {
  try {
    const dn = new Intl.DisplayNames([displayLocale], { type: 'language' });
    const name = dn.of(code);
    if (name && name !== code) return name.charAt(0).toUpperCase() + name.slice(1);
  } catch { /* fallback */ }
  return LANG_MAP[code]?.name || code;
}

export function VoicesTab() {
  const { setCustomVoice, resetVoice, getVoiceId } = useAgentContext();
  const { getAPIKey, language: appLanguage } = useSettingsContext();
  const t = useT();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadVoices = async () => {
    const key = getAPIKey('elevenlabs');
    if (!key) return;

    setLoading(true);
    try {
      const res = await fetch(`${TTS.apiBase}/voices`, {
        headers: { 'xi-api-key': key },
      });
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (err) {
      console.error('[voices] Errore caricamento catalogo:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadVoices(); }, []);

  const filteredVoices = voices.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const previewVoice = (previewUrl?: string) => {
    if (!previewUrl) return;
    const audio = new Audio(previewUrl);
    audio.play();
  };

  return (
    <div className="tab-content">
      <h4>{t('voicesAssigned')}</h4>
      <div className="voice-assignments">
        {AGENTS.map(agent => (
          <div key={agent.id} className="voice-row">
            <span style={{ color: agent.color }}>{agent.emoji} {agent.name}</span>
            <code className="voice-id">{getVoiceId(agent.id).substring(0, 12)}...</code>
            <button className="btn btn-sm" onClick={() => resetVoice(agent.id)}>Reset</button>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <h4>{t('voicesCatalog')}</h4>
      {!getAPIKey('elevenlabs') && (
        <p className="tab-description">{t('voicesNeedKey')}</p>
      )}

      {voices.length > 0 && (
        <>
          <input
            className="field-input"
            placeholder={t('voicesSearch')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="voice-catalog">
            {filteredVoices.slice(0, 20).map(voice => {
              const langs = extractLanguages(voice);
              const otherLabels = voice.labels ? getNonLanguageLabels(voice.labels) : '';

              return (
                <div key={voice.voice_id} className="voice-card">
                  <div className="voice-card-info">
                    <div className="voice-card-header">
                      <strong>{voice.name}</strong>
                      {langs.length > 0 && (
                        <span className="voice-lang-flags">
                          {langs.map((l, i) => (
                            <span key={i} className="voice-lang-flag" title={l.name}>
                              {l.flag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    {langs.length > 0 && (
                      <span className="voice-lang-names">
                        {langs.map(l => getLocalizedLangName(l.name.toLowerCase(), appLanguage)).join(', ')}
                      </span>
                    )}
                    {otherLabels && (
                      <span className="voice-labels">{otherLabels}</span>
                    )}
                  </div>
                  <div className="voice-card-actions">
                    {voice.preview_url && (
                      <button className="btn btn-sm" onClick={() => previewVoice(voice.preview_url)}>
                        ▶ {t('voicesTry')}
                      </button>
                    )}
                    {AGENTS.map(agent => (
                      <button
                        key={agent.id}
                        className="btn btn-sm voice-agent-btn"
                        onClick={() => setCustomVoice(agent.id, voice.voice_id)}
                        title={`Assegna a ${agent.name}`}
                      >
                        <span className="voice-agent-dot" style={{ background: agent.color }} />
                        {agent.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading && <p>{t('voicesLoading')}</p>}

      <button className="btn btn-secondary" onClick={loadVoices} disabled={loading}>
        {t('voicesReload')}
      </button>
    </div>
  );
}
