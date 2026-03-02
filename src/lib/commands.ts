import { AGENTS, getAgent } from './agents';
import { loadAPIKeys, loadCustomVoices, loadExcludedAgents, saveCustomVoices } from './storage';
import { DEFAULT_MODELS } from './constants';

export interface CommandResult {
  handled: boolean;
  systemMessage?: string;
}

/**
 * Gestisce i comandi slash. Ritorna { handled: true, systemMessage } se il comando è riconosciuto.
 */
export function handleCommand(text: string): CommandResult {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === '/help' || trimmed === '/aiuto') return cmdHelp();
  if (trimmed === '/voci' || trimmed === '/voices') return cmdVoci();
  if (trimmed === '/keys') return cmdKeys();
  if (trimmed === '/stato' || trimmed === '/status') return cmdStato();
  if (trimmed.startsWith('/voce ') || trimmed.startsWith('/voice ')) return cmdVoce(text.trim());

  return { handled: false };
}

function cmdHelp(): CommandResult {
  return {
    handled: true,
    systemMessage: `📖 **Comandi disponibili:**

/help — Mostra questo messaggio
/voci — Mostra le voci assegnate agli agenti
/voce AGENTE=VOICE_ID — Assegna una voce a un agente
/voce AGENTE=reset — Ripristina la voce predefinita
/keys — Mostra lo stato delle chiavi API
/stato — Diagnostica del sistema

⌨️ **Scorciatoie:**
Ctrl+K — Apri impostazioni
🎤 — Parla al microfono`,
  };
}

function cmdVoci(): CommandResult {
  const customVoices = loadCustomVoices();
  const lines = AGENTS.map(a => {
    const voiceId = customVoices[a.id] || a.defaultVoiceId;
    const isCustom = customVoices[a.id] ? ' (custom)' : ' (default)';
    return `${a.emoji} ${a.name}: ${voiceId.substring(0, 16)}...${isCustom}`;
  });

  return {
    handled: true,
    systemMessage: `🎙️ **Voci agenti:**\n\n${lines.join('\n')}\n\nUsa /voce AGENTE=ID per cambiare`,
  };
}

function cmdKeys(): CommandResult {
  const keys = loadAPIKeys();
  const providers = ['anthropic', 'openai', 'gemini', 'groq', 'elevenlabs'];
  const lines = providers.map(p => {
    const entry = keys.find(k => k.provider === p);
    const status = entry?.apiKey ? '✅' : '❌';
    const model = entry?.model || DEFAULT_MODELS[p as keyof typeof DEFAULT_MODELS] || '';
    return `${status} ${p}${model ? ` (${model})` : ''}`;
  });

  return {
    handled: true,
    systemMessage: `🔑 **Stato chiavi API:**\n\n${lines.join('\n')}\n\nPremi Ctrl+K per configurare`,
  };
}

function cmdStato(): CommandResult {
  const keys = loadAPIKeys();
  const excluded = loadExcludedAgents();
  const customVoices = loadCustomVoices();
  const activeCount = AGENTS.length - excluded.length;

  const keysOk = keys.filter(k => k.apiKey).length;
  const hasElevenLabs = keys.some(k => k.provider === 'elevenlabs' && k.apiKey);
  const customVoicesCount = Object.keys(customVoices).length;

  return {
    handled: true,
    systemMessage: `📊 **Stato sistema BarTalk v8.0:**

🤖 Agenti: ${activeCount}/${AGENTS.length} attivi${excluded.length > 0 ? ` (esclusi: ${excluded.join(', ')})` : ''}
🔑 Chiavi API: ${keysOk}/5 configurate
🎙️ TTS: ${hasElevenLabs ? 'ElevenLabs attivo' : 'Solo Web Speech (manca chiave ElevenLabs)'}
🎵 Voci custom: ${customVoicesCount}
📡 Proxy: /api/ai-proxy
💾 Storage: localStorage`,
  };
}

function cmdVoce(text: string): CommandResult {
  // /voce albert=pNInz6obpgDQGcFmaJgB
  const match = text.match(/\/voce?\s+(\w+)\s*=\s*(\S+)/i);
  if (!match) {
    return {
      handled: true,
      systemMessage: '❓ Uso: /voce AGENTE=VOICE_ID oppure /voce AGENTE=reset',
    };
  }

  const agentName = match[1].toLowerCase();
  const voiceValue = match[2];
  const agent = getAgent(agentName);

  if (!agent) {
    return {
      handled: true,
      systemMessage: `❌ Agente "${agentName}" non trovato. Agenti: ${AGENTS.map(a => a.id).join(', ')}`,
    };
  }

  const voices = loadCustomVoices();

  if (voiceValue.toLowerCase() === 'reset') {
    delete voices[agent.id];
    saveCustomVoices(voices);
    return {
      handled: true,
      systemMessage: `✅ Voce di ${agent.name} ripristinata al default (${agent.defaultVoiceId.substring(0, 12)}...)`,
    };
  }

  voices[agent.id] = voiceValue;
  saveCustomVoices(voices);
  return {
    handled: true,
    systemMessage: `✅ Voce di ${agent.name} cambiata a: ${voiceValue.substring(0, 16)}...`,
  };
}
