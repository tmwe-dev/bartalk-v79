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

/**
 * Motore principale dell'orchestratore.
 * Coordina le chiamate sequenziali ai 4 agenti AI.
 *
 * Logica:
 * 1. Primi N turni → modalità "consultation" forzata (tutti rispondono)
 * 2. Dopo → modalità scelta dall'utente
 * 3. Ogni agente riceve il contesto delle risposte precedenti
 * 4. Analisi convergenza per evitare stagnazione
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

  // ── Analizza convergenza ─────────────────────────────────────────
  const convergence = analyzeConvergence(messages);
  const convergenceInstruction = getConvergenceInstruction(convergence);

  // ── Seleziona agenti da far parlare ──────────────────────────────
  const plan = buildPlan(mode, input.turnStrategy, enabledAgents, turnIndex);

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
      // Continua con il prossimo agente — nessun blocco a cascata
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
): OrchestratorPlan {
  let agentsToSpeak: AgentConfig[];

  if (mode === 'standard') {
    // Un solo agente a turno
    const idx = turnStrategy === 'random'
      ? Math.floor(Math.random() * enabledAgents.length)
      : turnIndex % enabledAgents.length;
    agentsToSpeak = [enabledAgents[idx]];
  } else {
    // Consultation / Bar Realtime: tutti gli agenti
    agentsToSpeak = [...enabledAgents];
  }

  return {
    mode: mode as OrchestratorPlan['mode'],
    agentsToSpeak,
    systemPrompts: new Map(),
    convergence: 'neutral',
    temperature: ORCHESTRATOR.defaultTemperature,
    wordRange: mode === 'consultation'
      ? ORCHESTRATOR.consultationWordRange
      : ORCHESTRATOR.wordRange,
    isForced: turnIndex < ORCHESTRATOR.forcedConsultationTurns,
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

  // Se non c'è chiave API → risposta demo
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

  // ── Costruisci system prompt ───────────────────────────────────
  const systemPrompt = buildSystemPrompt(agent, previousResponses, convergenceInstruction, plan);

  // ── Costruisci messaggi ────────────────────────────────────────
  const apiMessages = buildMessages(userMessage, history, previousResponses);

  // ── Chiama il proxy ────────────────────────────────────────────
  const result = await callProxy({
    provider: agent.provider,
    model,
    messages: apiMessages,
    systemPrompt,
    temperature: plan.temperature,
    maxTokens: ORCHESTRATOR.maxTokens,
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

// ── System prompt ────────────────────────────────────────────────────
function buildSystemPrompt(
  agent: AgentConfig,
  previousResponses: { name: string; content: string }[],
  convergenceInstruction: string,
  plan: OrchestratorPlan,
): string {
  const [minWords, maxWords] = plan.wordRange;

  let prompt = `Sei ${agent.name}, un agente AI in BarTalk RadioChat.
Rispondi in italiano in modo naturale e conversazionale.
Mantieni le risposte tra ${minWords} e ${maxWords} parole.
Non ripetere quello che hanno già detto gli altri.`;

  // In consultation: aggiungi contesto delle risposte precedenti
  if (previousResponses.length > 0 && plan.mode !== 'standard') {
    prompt += '\n\nRisposte precedenti degli altri agenti:';
    for (const prev of previousResponses) {
      prompt += `\n- ${prev.name}: "${prev.content.substring(0, 300)}"`;
    }
    prompt += '\n\nAggiungi il tuo punto di vista unico, senza ripetere quanto già detto.';
  }

  // Istruzione convergenza
  if (convergenceInstruction) {
    prompt += convergenceInstruction;
  }

  return prompt;
}

// ── Messaggi per l'API ───────────────────────────────────────────────
function buildMessages(
  userMessage: string,
  history: Message[],
  _previousResponses: { name: string; content: string }[],
): { role: string; content: string }[] {
  const msgs: { role: string; content: string }[] = [];

  // Ultimi 10 messaggi di cronologia (per contesto)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    msgs.push({
      role: msg.senderType === 'human' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Messaggio corrente dell'utente
  msgs.push({ role: 'user', content: userMessage });

  return msgs;
}
