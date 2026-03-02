export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'groq';

export interface AgentConfig {
  id: string;
  name: string;
  provider: ProviderType;
  emoji: string;
  color: string;
  glowColor: string;
  defaultModel: string;
  defaultVoiceId: string;
  staticImage: string;
  talkGif: string;
  demoResponse: string;
}

export interface AgentState {
  name: string;
  senderType: string;
  isEnabled: boolean;
  index: number;
}
