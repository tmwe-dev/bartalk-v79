import type { AgentConfig, ProviderType } from '../types/agents';

export const AGENTS: AgentConfig[] = [
  {
    id: 'albert',
    name: 'Albert',
    provider: 'openai',
    emoji: '🟢',
    color: '#22c55e',
    glowColor: 'rgba(34,197,94,0.4)',
    defaultModel: 'gpt-4o',
    defaultVoiceId: 'pNInz6obpgDQGcFmaJgB',
    staticImage: '/assets/albert-static.png',
    talkGif: '/assets/albert-talk.gif',
    demoResponse: 'Aggiungo il mio punto di vista alla discussione. [Demo]',
  },
  {
    id: 'archimede',
    name: 'Archimede',
    provider: 'anthropic',
    emoji: '🟣',
    color: '#a855f7',
    glowColor: 'rgba(168,85,247,0.4)',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultVoiceId: 'ErXwobaYiN019PkySvjV',
    staticImage: '/assets/archimede-static.png',
    talkGif: '/assets/archimede-talk.gif',
    demoResponse: 'Interessante prospettiva, approfondiamo insieme. [Demo]',
  },
  {
    id: 'pitagora',
    name: 'Pitagora',
    provider: 'gemini',
    emoji: '🔵',
    color: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.4)',
    defaultModel: 'gemini-2.0-flash',
    defaultVoiceId: 'VR6AewLTigWG4xSOukaG',
    staticImage: '/assets/pitagora-static.png',
    talkGif: '/assets/pitagora-talk.gif',
    demoResponse: 'Dalla mia analisi emergono diversi aspetti. [Demo]',
  },
  {
    id: 'newton',
    name: 'Newton',
    provider: 'groq',
    emoji: '🟠',
    color: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.4)',
    defaultModel: 'llama-3.3-70b-versatile',
    defaultVoiceId: 'onwK4e9ZLuTAKqWW03F9',
    staticImage: '/assets/newton-static.png',
    talkGif: '/assets/newton-talk.gif',
    demoResponse: 'Ecco la mia prospettiva su questo argomento. [Demo]',
  },
];

export function getAgent(nameOrId: string): AgentConfig | undefined {
  const key = nameOrId.toLowerCase();
  return AGENTS.find(a => a.id === key || a.name.toLowerCase() === key);
}

export function getAgentByProvider(provider: ProviderType): AgentConfig | undefined {
  return AGENTS.find(a => a.provider === provider);
}

/** Mappa senderType (chatgpt/claude/gemini/groq) → provider */
export function senderTypeToProvider(senderType: string): ProviderType {
  const s = senderType.toLowerCase();
  if (s === 'chatgpt' || s === 'openai') return 'openai';
  if (s === 'claude' || s === 'anthropic') return 'anthropic';
  if (s === 'groq' || s === 'llama') return 'groq';
  return 'gemini';
}

/** Mappa provider → senderType per compatibilità */
export function providerToSenderType(provider: ProviderType): string {
  if (provider === 'openai') return 'chatgpt';
  if (provider === 'anthropic') return 'claude';
  if (provider === 'groq') return 'groq';
  return 'gemini';
}
