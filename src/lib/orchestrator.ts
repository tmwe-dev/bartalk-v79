import type { AgentConfig } from '../types/agents';
import type { Message } from '../types/conversation';
import type {
  OrchestratorInput,
  OrchestratorResult,
  AgentResponse,
  OrchestratorPlan,
} from '../types/orchestrator';
import { callProxy } from './proxy';
import { getAPIKey, getModel } from './storage';
import { ORCHESTRATOR, DEFAULT_MODELS } from './constants';
import { analyzeConvergence, getConvergenceInstruction } from './convergence';
import { generateId } from './utils';
import { buildRichSystemPrompt } from './prompts';

/**
 * Motore principale dell'orchestratore.
 * Coordina le chiamate sequenziali ai 4 agenti AI.
 */
export async function orchestrate(
  input: OrchestratorInput,
  onAgentResponse?: (response: AgentResponse) => void,
): Promise<OrchestratorResult> {
  const turnId = generateId();
  const { userMessage, messages, turnIndex, enabledAgents } = input;

  if (enabledAgents.length === 0) {
    return {
      responses: [],
      newTurnIndex: turnIndex,
      convergence: 'neutral',
      turnId,
    };
  }

  // ── Determina modalità ───────────────────────────────────────────
  const isForced = turnIndex < ORCHESTRATOR.forcedConsultationTurns;
  const mode = isForced ? 'consultation' : input.mode;

  // ── Analizza convergenza (con lingua) ───────────────────────────
  const convergence = analyzeConvergence(messages, input.language);
  const convergenceInstruction = getConvergenceInstruction(convergence, input.language);

  // ── Seleziona agenti da far parlare ──────────────────────────────
  const plan = buildPlan(mode, input.turnStrategy, enabledAgents, turnIndex, input);

  // ── Esegui chiamate sequenziali ──────────────────────────────────
  const responses: AgentResponse[] = [];
  const previousResponses: { name: string; content: string }[] = [];

  for (const agent of plan.agentsToSpeak) {
    try {
      const response = await callAgent(
        agent,
        userMessage,
        messages,
        previousResponses,
        convergenceInstruction,
        plan,
      );

      if (response.content) {
        responses.push(response);
        previousResponses.push({ name: agent.name, content: response.content });
        onAgentResponse?.(response);
      }
    } catch (err) {
      console.error(`[orchestrator] Errore ${agent.name}:`, err);
    }
  }

  return {
    responses,
    newTurnIndex: turnIndex + 1,
    convergence,
    turnId,
  };
}

// ── Costruisce il piano ──────────────────────────────────────────────
function buildPlan(
  mode: string,
  turnStrategy: string,
  enabledAgents: AgentConfig[],
  turnIndex: number,
  input: OrchestratorInput,
): OrchestratorPlan {
  let agentsToSpeak: AgentConfig[];

  if (mode === 'standard') {
    const idx = turnStrategy === 'random'
      ? Math.floor(Math.random() * enabledAgents.length)
      : turnIndex % enabledAgents.length;
    agentsToSpeak = [enabledAgents[idx]];
  } else {
    agentsToSpeak = [...enabledAgents];
  }

  // Word range ottimale per modalità
  const wordRange = mode === 'consultation' || mode === 'bar_realtime'
    ? ORCHESTRATOR.consultationWordRange
    : (input.wordRange || ORCHESTRATOR.wordRange);

  // Temperature: usa il mix ottimale per modalità se l'utente non ha personalizzato
  const modeKey = mode as keyof typeof ORCHESTRATOR.temperatureByMode;
  const defaultTemp = ORCHESTRATOR.temperatureByMode[modeKey] ?? ORCHESTRATOR.defaultTemperature;
  const temperature = input.temperature !== undefined && input.temperature !== ORCHESTRATOR.defaultTemperature
    ? input.temperature
    : defaultTemp;

  return {
    mode: mode as OrchestratorPlan['mode'],
    agentsToSpeak,
    systemPrompts: new Map(),
    convergence: 'neutral',
    temperature,
    maxTokens: input.maxTokens ?? ORCHESTRATOR.maxTokens,
    wordRange,
    isForced: turnIndex < ORCHESTRATOR.forcedConsultationTurns,
    language: input.language || 'it',
  };
}

// ── Chiama un singolo agente ─────────────────────────────────────────
async function callAgent(
  agent: AgentConfig,
  userMessage: string,
  history: Message[],
  previousResponses: { name: string; content: string }[],
  convergenceInstruction: string,
  plan: OrchestratorPlan,
): Promise<AgentResponse> {
  const startTime = Date.now();
  const apiKey = getAPIKey(agent.provider);
  const model = getModel(agent.provider) || DEFAULT_MODELS[agent.provider];

  if (!apiKey) {
    return {
      agentName: agent.name,
      provider: agent.provider,
      content: agent.demoResponse,
      tokensIn: 0,
      tokensOut: 0,
      duration: Date.now() - startTime,
      isDemo: true,
    };
  }

  const systemPrompt = buildRichSystemPrompt(agent, previousResponses, convergenceInstruction, plan);
  const apiMessages = buildMessages(userMessage, history, plan.mode);

  const result = await callProxy({
    provider: agent.provider,
    model,
    messages: apiMessages,
    systemPrompt,
    temperature: plan.temperature,
    maxTokens: plan.maxTokens,
    apiKey,
  });

  if (result.error) {
    return {
      agentName: agent.name,
      provider: agent.provider,
      content: `[Errore ${agent.provider}: ${result.detail || result.error}]`,
      tokensIn: 0,
      tokensOut: 0,
      duration: Date.now() - startTime,
      isDemo: false,
      error: result.error,
    };
  }

  return {
    agentName: agent.name,
    provider: agent.provider,
    content: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    duration: result.duration,
    isDemo: false,
  };
}

// ── Messaggi per l'API (con history slice per modalità) ──────────────
function buildMessages(
  userMessage: string,
  history: Message[],
  mode?: string,
): { role: string; content: string }[] {
  const msgs: { role: string; content: string }[] = [];

  const modeKey = (mode || 'standard') as keyof typeof ORCHESTRATOR.historySlice;
  const sliceSize = ORCHESTRATOR.historySlice[modeKey] ?? 10;

  const recentHistory = history.slice(-sliceSize);
  for (const msg of recentHistory) {
    msgs.push({
      role: msg.senderType === 'human' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}
