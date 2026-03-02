import type { AgentConfig } from './agents';
import type { ConversationMode, TurnStrategy, Message } from './conversation';

export type ConvergenceState = 'agreement' | 'divergence' | 'stagnation' | 'neutral';

export interface OrchestratorPlan {
  mode: ConversationMode;
  agentsToSpeak: AgentConfig[];
  systemPrompts: Map<string, string>;
  convergence: ConvergenceState;
  temperature: number;
  wordRange: [number, number];
  isForced: boolean;
}

export interface AgentResponse {
  agentName: string;
  provider: string;
  content: string;
  tokensIn: number;
  tokensOut: number;
  duration: number;
  isDemo: boolean;
  error?: string;
}

export interface OrchestratorInput {
  conversationId: string;
  userMessage: string;
  messages: Message[];
  turnIndex: number;
  mode: ConversationMode;
  turnStrategy: TurnStrategy;
  enabledAgents: AgentConfig[];
}

export interface OrchestratorResult {
  responses: AgentResponse[];
  newTurnIndex: number;
  convergence: ConvergenceState;
  turnId: string;
}
