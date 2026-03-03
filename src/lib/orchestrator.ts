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
import { buildMemoryMessages, shouldTriggerSummary, generateAutoSummary } from './memory';

// ── Keywords per skip logic (consenso) ───────────────────────────────
const SKIP_KEYWORDS = [
  'concordo', 'sono d\'accordo', 'esatto', 'perfetto', 'giusto', 'condivido',
  'agree', 'exactly', 'correct', 'right', 'indeed',
  'de acuerdo', 'exactamente',
  'd\'accord', 'exactement',
];

/**
 * Motore principale dell'orchestratore.
 * Coordina le chiamate sequenziali ai 4 agenti AI.
 * Con: memoria a 3 livelli, skip logic, riassunto automatico.
 */
export async function orchestrate(
  input: OrchestratorInput,
  onAgentResponse?: (response: AgentResponse) => void,
): Promise<OrchestratorResult> {
  const turnId = generateId();
  const { userMessage, messages, turnIndex, enabledAgents, conversationId } = input;

  if (enabledAgents.length === 0) {
    return {
      responses: [],
      newTurnIndex: turnIndex,
      convergence: 'neutral',
      turnId,
    };
  }

  // ── Riassunto automatico (background, non blocca) ─────────────────
  if (shouldTriggerSummary(messages, conversationId)) {
    generateAutoSummary(messages, conversationId).then(summary => {
      if (summary) {
        console.log(`[orchestrator] Riassunto automatico generato: ${summary.messageRange[0]}-${summary.messageRange[1]}`);
      }
    }).catch(err => {
      console.warn('[orchestrator] Errore riassunto auto:', err);
    });
  }

  // ── Determina modalità ───────────────────────────────────────────
  const isForced = turnIndex < ORCHESTRATOR.forcedConsultationTurns;
  const mode = isForced ? 'consultation' : input.mode;

  // ── Analizza convergenza (con lingua) ───────────────────────────
  const convergence = analyzeConvergence(messages, input.language);
  const convergenceInstruction = getConvergenceInstruction(convergence, input.language);

  // ── Seleziona agenti da far parlare (con skip logic) ──────────────
  const plan = buildPlan(mode, input.turnStrategy, enabledAgents, turnIndex, input);

  // ── Esegui chiamate sequenziali ──────────────────────────────────
  const responses: AgentResponse[] = [];
  const previousResponses: { name: string; content: string }[] = [];

  for (const agent of plan.agentsToSpeak) {
    // ── Skip logic: salta se c'è consenso e non ci sono domande ────
    if (mode === 'standard' && shouldSkipAgent(messages, userMessage, turnIndex)) {
      console.log(`[orchestrator] Skip ${agent.name} (consenso rilevato)`);
      continue;
    }

    // Risolvi task context per agente specifico
    const resolvedTaskContext = typeof input.taskContext === 'function'
      ? input.taskContext(agent.id)
      : input.taskContext;

    try {
      const response = await callAgent(
        agent,
        userMessage,
        messages,
        previousResponses,
        convergenceInstruction,
        plan,
        resolvedTaskContext,
        conversationId,
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

// ── Skip Logic (da TMwEngine) ────────────────────────────────────────

function shouldSkipAgent(
  messages: Message[],
  userMessage: string,
  turnIndex: number,
): boolean {
  // Non skippare nei primi turni o se c'è una domanda
  if (turnIndex < 4) return false;
  if (userMessage.includes('?')) return false;

  const recent = messages.filter(m => m.senderType === 'assistant').slice(-3);
  if (recent.length < 3) return false;

  // Conta quanti degli ultimi 3 messaggi contengono keyword di consenso
  let agreementCount = 0;
  for (const msg of recent) {
    const lower = msg.content.toLowerCase();
    if (SKIP_KEYWORDS.some(k => lower.includes(k))) {
      agreementCount++;
    }
  }

  // Skip se almeno 2 su 3 sono in accordo
  return agreementCount >= 2;
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
    if (turnStrategy === 'smart') {
      // Smart: 30% random, 70% sequenziale (come TMwEngine)
      const shouldRandomize = Math.random() < 0.3;
      if (shouldRandomize && enabledAgents.length > 1) {
        // Random, escludendo l'ultimo che ha parlato
        const lastIdx = turnIndex > 0 ? (turnIndex - 1) % enabledAgents.length : -1;
        const available = enabledAgents.filter((_, i) => i !== lastIdx);
        const picked = available[Math.floor(Math.random() * available.length)];
        agentsToSpeak = [picked];
      } else {
        agentsToSpeak = [enabledAgents[turnIndex % enabledAgents.length]];
      }
    } else if (turnStrategy === 'random') {
      const idx = Math.floor(Math.random() * enabledAgents.length);
      agentsToSpeak = [enabledAgents[idx]];
    } else {
      // round_robin
      agentsToSpeak = [enabledAgents[turnIndex % enabledAgents.length]];
    }
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
  taskContext?: string,
  conversationId?: string,
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

  const systemPrompt = buildRichSystemPrompt(agent, previousResponses, convergenceInstruction, plan, taskContext);

  // ── Memoria a 3 livelli ───────────────────────────────────────────
  const apiMessages = conversationId
    ? buildMemoryMessages(userMessage, history, conversationId)
    : buildMessagesLegacy(userMessage, history, plan.mode);

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

// ── Fallback: messaggi senza memoria (legacy) ────────────────────────

function buildMessagesLegacy(
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
