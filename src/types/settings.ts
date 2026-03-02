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

export interface AppSettings {
  apiKeys: APIKeyEntry[];
  customVoices: VoiceConfig;
  excludedAgents: string[];
  conversationMode: ConversationMode;
  turnStrategy: TurnStrategy;
  ttsEnabled: boolean;
}
