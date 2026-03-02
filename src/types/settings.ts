import type { ProviderType } from './agents';
import type { ConversationMode, TurnStrategy } from './conversation';

export interface APIKeyEntry {
  provider: ProviderType | 'elevenlabs';
  apiKey: string;
  model?: string;
}

export interface VoiceConfig {
  [agentName: string]: string; // agentName → ElevenLabs voiceId
}

export type AppLanguage = 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt';

export interface LanguageConfig {
  value: AppLanguage;
  label: string;
  flag: string;
  bcp47: string;        // BCP-47 per Speech Recognition e Web Speech TTS
  instruction: string;  // Istruzione per il system prompt degli agenti
  ui: {
    placeholder: string;
    listening: string;
    waiting: string;
    micUnsupported: string;
    stopRecording: string;
    speak: string;
  };
}

export const LANGUAGES: LanguageConfig[] = [
  {
    value: 'it', label: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT',
    instruction: 'Rispondi in italiano in modo naturale e conversazionale.',
    ui: { placeholder: 'Scrivi un messaggio...', listening: 'Sto ascoltando...', waiting: 'Gli agenti stanno rispondendo...', micUnsupported: 'Microfono non supportato', stopRecording: 'Ferma registrazione', speak: 'Parla' },
  },
  {
    value: 'en', label: 'English', flag: '🇬🇧', bcp47: 'en-US',
    instruction: 'Reply in English in a natural and conversational way.',
    ui: { placeholder: 'Type a message...', listening: 'Listening...', waiting: 'Agents are responding...', micUnsupported: 'Microphone not supported', stopRecording: 'Stop recording', speak: 'Speak' },
  },
  {
    value: 'es', label: 'Español', flag: '🇪🇸', bcp47: 'es-ES',
    instruction: 'Responde en español de forma natural y conversacional.',
    ui: { placeholder: 'Escribe un mensaje...', listening: 'Escuchando...', waiting: 'Los agentes están respondiendo...', micUnsupported: 'Micrófono no soportado', stopRecording: 'Detener grabación', speak: 'Habla' },
  },
  {
    value: 'fr', label: 'Français', flag: '🇫🇷', bcp47: 'fr-FR',
    instruction: 'Réponds en français de manière naturelle et conversationnelle.',
    ui: { placeholder: 'Écris un message...', listening: 'J\'écoute...', waiting: 'Les agents répondent...', micUnsupported: 'Micro non supporté', stopRecording: 'Arrêter l\'enregistrement', speak: 'Parle' },
  },
  {
    value: 'de', label: 'Deutsch', flag: '🇩🇪', bcp47: 'de-DE',
    instruction: 'Antworte auf Deutsch auf natürliche und konversationelle Weise.',
    ui: { placeholder: 'Nachricht schreiben...', listening: 'Höre zu...', waiting: 'Die Agenten antworten...', micUnsupported: 'Mikrofon nicht unterstützt', stopRecording: 'Aufnahme stoppen', speak: 'Sprechen' },
  },
  {
    value: 'pt', label: 'Português', flag: '🇧🇷', bcp47: 'pt-BR',
    instruction: 'Responda em português de forma natural e conversacional.',
    ui: { placeholder: 'Escreva uma mensagem...', listening: 'Ouvindo...', waiting: 'Os agentes estão respondendo...', micUnsupported: 'Microfone não suportado', stopRecording: 'Parar gravação', speak: 'Fale' },
  },
];

/** Helper: ottieni configurazione lingua per codice */
export function getLangConfig(lang: AppLanguage): LanguageConfig {
  return LANGUAGES.find(l => l.value === lang) || LANGUAGES[0];
}

export interface AppSettings {
  apiKeys: APIKeyEntry[];
  customVoices: VoiceConfig;
  excludedAgents: string[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
  language: AppLanguage;
  temperature: number;
  maxTokens: number;
  wordRange: [number, number];
}
