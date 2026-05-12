/**
 * BarTalk v8 — Tool Registry
 * Registro centralizzato dei tool disponibili per gli agenti.
 * Gestisce definizioni, formattazione per provider, e prompt instructions.
 *
 * @deprecated Modulo attualmente non integrato nel codebase.
 * Mantenuto per futura integrazione del sistema tool/function-calling.
 * Nessun file importa da questo modulo (verificato 2026-03-07).
 */

import type {
  ToolDefinition,
  ToolSettings,
  AnthropicToolDef,
  OpenAIToolDef,
  GeminiFunctionDeclaration,
} from '../types/tools';
import type { ProviderType } from '../types/agents';

// ── Tool Definitions ─────────────────────────────────────────────────

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information on a topic. Returns a list of relevant results with titles, URLs, and snippets. Use this when you need up-to-date data, facts, statistics, or current events.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific and include relevant keywords.',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (1-10).',
          default: 5,
        },
      },
      required: ['query'],
    },
    providerSupport: 'all',
    category: 'search',
    enabled: true,
  },
  {
    name: 'web_fetch',
    description: 'Fetch and extract the text content of a specific web page. Returns the page title and main text content. Use this to read articles, documentation, or any web page in detail after finding it via web_search.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL of the page to fetch (must start with http:// or https://).',
        },
        max_chars: {
          type: 'number',
          description: 'Maximum characters of content to return (default 8000).',
          default: 8000,
        },
      },
      required: ['url'],
    },
    providerSupport: 'all',
    category: 'fetch',
    enabled: true,
  },
  {
    name: 'save_finding',
    description: 'Save an important finding or piece of information as an exploration card attached to the current conversation. Use this when you discover something valuable that the team should keep for reference.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'A short descriptive title for this finding.',
        },
        content: {
          type: 'string',
          description: 'The key information to save. Be concise but include all important details.',
        },
        source: {
          type: 'string',
          description: 'The source URL or reference for this information.',
        },
        type: {
          type: 'string',
          description: 'Type of finding.',
          enum: ['webpage', 'data', 'summary'],
        },
      },
      required: ['title', 'content', 'source'],
    },
    providerSupport: 'all',
    category: 'file',
    enabled: true,
  },
];

// ── Registry API ─────────────────────────────────────────────────────

/**
 * Ritorna i tool abilitati in base alle settings.
 */
export function getEnabledTools(settings: ToolSettings): ToolDefinition[] {
  return TOOL_DEFINITIONS.filter(tool => {
    if (tool.name === 'web_search') return settings.enableWebSearch;
    if (tool.name === 'web_fetch') return settings.enableWebFetch;
    if (tool.name === 'save_finding') return settings.enableSaveFinding;
    return tool.enabled;
  });
}

/**
 * Ritorna tutte le definizioni tool (anche disabilitate).
 */
export function getAllToolDefinitions(): ToolDefinition[] {
  return [...TOOL_DEFINITIONS];
}

// ── Provider Formatting ──────────────────────────────────────────────

/**
 * Converte tool definitions nel formato nativo Anthropic.
 */
export function formatToolsForAnthropic(tools: ToolDefinition[]): AnthropicToolDef[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object' as const,
      properties: tool.inputSchema.properties,
      required: tool.inputSchema.required,
    },
  }));
}

/**
 * Converte tool definitions nel formato OpenAI function calling.
 */
export function formatToolsForOpenAI(tools: ToolDefinition[]): OpenAIToolDef[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required,
      },
    },
  }));
}

/**
 * Converte tool definitions nel formato Gemini function declarations.
 */
export function formatToolsForGemini(tools: ToolDefinition[]): GeminiFunctionDeclaration[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'OBJECT' as const,
      properties: tool.inputSchema.properties,
      required: tool.inputSchema.required,
    },
  }));
}

/**
 * Formatta i tool per qualsiasi provider.
 */
export function formatToolsForProvider(
  tools: ToolDefinition[],
  provider: ProviderType,
): AnthropicToolDef[] | OpenAIToolDef[] | GeminiFunctionDeclaration[] | null {
  if (tools.length === 0) return null;

  switch (provider) {
    case 'anthropic':
      return formatToolsForAnthropic(tools);
    case 'openai':
    case 'groq':
      return formatToolsForOpenAI(tools);
    case 'gemini':
      return formatToolsForGemini(tools);
    default:
      return null;
  }
}

// ── Prompt Section Builder ───────────────────────────────────────────

/**
 * Genera il blocco di istruzioni per la sezione §11 del prompt.
 * Descrive i tool disponibili e come/quando usarli.
 */
export function buildToolPromptSection(settings: ToolSettings, lang: string = 'it'): string {
  const enabledTools = getEnabledTools(settings);
  if (enabledTools.length === 0) return '';

  const isIT = lang === 'it';

  const parts: string[] = [];

  if (isIT) {
    parts.push('Hai accesso ai seguenti strumenti per esplorare e raccogliere informazioni:');
    parts.push('');

    for (const tool of enabledTools) {
      parts.push(`**${tool.name}**: ${tool.description}`);
      const params = Object.entries(tool.inputSchema.properties)
        .map(([key, val]) => `  - ${key}: ${val.description}`)
        .join('\n');
      parts.push(params);
      parts.push('');
    }

    parts.push('QUANDO USARE I TOOL:');
    parts.push('• Usa web_search quando hai bisogno di dati aggiornati, statistiche, o informazioni che non conosci con certezza.');
    parts.push('• Usa web_fetch quando trovi un risultato interessante e vuoi approfondire leggendo il contenuto completo della pagina.');
    parts.push('• Usa save_finding quando scopri qualcosa di importante che il gruppo dovrebbe conservare per riferimento futuro.');
    parts.push('');
    parts.push('QUANDO NON USARE I TOOL:');
    parts.push('• Non usare tool per informazioni che conosci già con sicurezza.');
    parts.push('• Non fare più di 2 ricerche per turno — sii mirato.');
    parts.push('• Non salvare ogni risultato — salva solo le scoperte veramente utili.');
  } else {
    parts.push('You have access to the following tools to explore and gather information:');
    parts.push('');

    for (const tool of enabledTools) {
      parts.push(`**${tool.name}**: ${tool.description}`);
      const params = Object.entries(tool.inputSchema.properties)
        .map(([key, val]) => `  - ${key}: ${val.description}`)
        .join('\n');
      parts.push(params);
      parts.push('');
    }

    parts.push('WHEN TO USE TOOLS:');
    parts.push('• Use web_search when you need up-to-date data, statistics, or information you are not certain about.');
    parts.push('• Use web_fetch when you find an interesting result and want to read the full page content.');
    parts.push('• Use save_finding when you discover something important the group should keep for future reference.');
    parts.push('');
    parts.push('WHEN NOT TO USE TOOLS:');
    parts.push('• Don\'t use tools for information you already know with certainty.');
    parts.push('• Don\'t make more than 2 searches per turn — be targeted.');
    parts.push('• Don\'t save every result — only save truly useful findings.');
  }

  return parts.join('\n');
}

// ── Storage per settings ─────────────────────────────────────────────

const TOOL_SETTINGS_KEY = 'bartalk_tool_settings';

export function loadToolSettings(): ToolSettings {
  try {
    const saved = localStorage.getItem(TOOL_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...getDefaultToolSettings(), ...parsed };
    }
  } catch { /* ignore */ }
  return getDefaultToolSettings();
}

export function saveToolSettings(settings: ToolSettings): void {
  try {
    localStorage.setItem(TOOL_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('[toolRegistry] Error saving tool settings:', e);
  }
}

function getDefaultToolSettings(): ToolSettings {
  return {
    enableWebSearch: false,
    enableWebFetch: false,
    enableSaveFinding: false,
    maxToolIterations: 3,
  };
}
