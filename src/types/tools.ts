/**
 * BarTalk v8 — Tool System Types
 * Definizioni per il sistema di strumenti che gli agenti possono invocare.
 * Supporta: web_search, web_fetch, save_finding
 */

// ── Tool Definitions ─────────────────────────────────────────────────

export type ToolCategory = 'search' | 'fetch' | 'analysis' | 'file';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  /** Quale provider supporta tool_use nativo */
  providerSupport: 'all' | 'anthropic' | 'openai_anthropic';
  category: ToolCategory;
  enabled: boolean;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    default?: unknown;
  }>;
  required: string[];
}

// ── Tool Call & Result ───────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError: boolean;
  artifacts?: ExplorationCard[];
}

// ── Exploration Cards ────────────────────────────────────────────────

export type ExplorationCardType = 'webpage' | 'data' | 'file' | 'summary';

export interface ExplorationCard {
  id: string;
  type: ExplorationCardType;
  title: string;
  source: string;           // URL o nome file
  snippet: string;           // Preview breve (max 200 chars)
  fullContent?: string;      // Contenuto completo (opzionale, per salvataggio)
  timestamp: string;         // ISO date
  agentName?: string;        // Chi ha trovato questo risultato
  savedToTask?: boolean;     // Se è stato salvato nei file del task
}

// ── Tool Execution State ─────────────────────────────────────────────

export interface ToolExecutionState {
  isExecuting: boolean;
  currentTool?: string;
  iterationCount: number;
  maxIterations: number;
  results: ToolResult[];
}

// ── Provider-Specific Tool Formats ───────────────────────────────────

/** Formato Anthropic tool_use */
export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** Formato OpenAI function calling */
export interface OpenAIToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/** Formato Gemini function declarations */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, unknown>;
    required: string[];
  };
}

// ── Settings ─────────────────────────────────────────────────────────

export interface ToolSettings {
  enableWebSearch: boolean;
  enableWebFetch: boolean;
  enableSaveFinding: boolean;
  braveApiKey?: string;
  maxToolIterations: number;  // default 3
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  enableWebSearch: false,
  enableWebFetch: false,
  enableSaveFinding: false,
  maxToolIterations: 3,
};
