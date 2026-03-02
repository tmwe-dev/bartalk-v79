import { ProviderTester } from './ProviderTester';
import { loadAPIKeys } from '../../lib/storage';
import { AGENTS } from '../../lib/agents';

export function StudioPage() {
  const keys = loadAPIKeys();

  return (
    <div className="studio-page">
      <h2>Studio Tecnico</h2>
      <p className="tab-description">
        Diagnostica e test dell'applicazione BarTalk.
      </p>

      <section className="studio-section">
        <h3>Stato Chiavi API</h3>
        <div className="studio-keys">
          {['anthropic', 'openai', 'gemini', 'groq', 'elevenlabs'].map(provider => {
            const hasKey = keys.some(k => k.provider === provider && k.apiKey);
            return (
              <div key={provider} className="studio-key-row">
                <span>{provider}</span>
                <span className={hasKey ? 'status-ok' : 'status-missing'}>
                  {hasKey ? '✅ Configurata' : '❌ Mancante'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="studio-section">
        <h3>Agenti</h3>
        <div className="studio-agents">
          {AGENTS.map(agent => (
            <div key={agent.id} className="studio-agent-row">
              <span style={{ color: agent.color }}>{agent.emoji} {agent.name}</span>
              <span>{agent.provider} · {agent.defaultModel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-section">
        <h3>Test Provider</h3>
        <ProviderTester />
      </section>

      <section className="studio-section">
        <h3>Info Sistema</h3>
        <div className="studio-info">
          <div>Versione: BarTalk v8.0</div>
          <div>Storage: localStorage</div>
          <div>Proxy: /api/ai-proxy</div>
          <div>TTS: ElevenLabs + Web Speech API</div>
          <div>Browser: {navigator.userAgent.substring(0, 60)}...</div>
        </div>
      </section>
    </div>
  );
}
