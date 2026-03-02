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

export const LANGUAGES: { value: AppLanguage; label: string; flag: string; instruction: string }[] = [
  { value: 'it', label: 'Italiano', flag: '🇮🇹', instruction: 'Rispondi in italiano in modo naturale e conversazionale.' },
  { value: 'en', label: 'English', flag: '🇬🇧', instruction: 'Reply in English in a natural and conversational way.' },
  { value: 'es', label: 'Español', flag: '🇪🇸', instruction: 'Responde en español de forma natural y conversacional.' },
  { value: 'fr', label: 'Français', flag: '🇫🇷', instruction: 'Réponds en français de manière naturelle et conversationnelle.' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪', instruction: 'Antworte auf Deutsch auf natürliche und konversationelle Weise.' },
  { value: 'pt', label: 'Português', flag: '🇧🇷', instruction: 'Responda em português de forma natural e conversacional.' },
];

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
