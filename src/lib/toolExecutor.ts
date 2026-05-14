/**
 * @module toolExecutor
 * Tool call executor for AI agent tool use.
 * Executes tool calls (web_search, web_fetch, save_finding) dispatched by AI agents,
 * returning structured results for integration into agent responses.
 */

import type { ToolCall, ToolResult, ExplorationCard } from '../types/tools';

// ── API Base ─────────────────────────────────────────────────────────

function getAPIBase(): string {
  return import.meta.env.VITE_API_BASE || '';
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Prova a ottenere il token Supabase
  try {
    const sessionData = localStorage.getItem('sb-session');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
  } catch { /* skip mode */ }

  // Se non c'è auth, usa skip mode
  if (!headers['Authorization']) {
    headers['X-BT-Skip-Auth'] = 'true';
  }

  return headers;
}

// ── Tool Execution ───────────────────────────────────────────────────

/**
 * Esegue una singola tool call chiamando il server endpoint appropriato.
 */
export async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  const base = getAPIBase();

  try {
    switch (call.name) {
      case 'web_search':
        return await executeWebSearch(base, call);
      case 'web_fetch':
        return await executeWebFetch(base, call);
      case 'save_finding':
        return executeSaveFinding(call);
      default:
        return {
          toolCallId: call.id,
          content: `Tool sconosciuto: ${call.name}`,
          isError: true,
        };
    }
  } catch (err) {
    console.error(`[toolExecutor] Error executing ${call.name}:`, err);
    return {
      toolCallId: call.id,
      content: `Errore esecuzione tool ${call.name}: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`,
      isError: true,
    };
  }
}

// ── Web Search ───────────────────────────────────────────────────────

async function executeWebSearch(base: string, call: ToolCall): Promise<ToolResult> {
  const { query, max_results } = call.input as { query: string; max_results?: number };

  const response = await fetch(`${base}/api/tools/web-search`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ query, max_results: max_results || 5 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    return {
      toolCallId: call.id,
      content: `Errore ricerca web: ${err.error || err.detail || response.statusText}`,
      isError: true,
    };
  }

  const data = await response.json();
  const results = data.results || [];

  // Formatta risultati come testo per il modello
  const formatted = results
    .map((r: { title: string; url: string; snippet: string }, i: number) =>
      `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`)
    .join('\n\n');

  // Crea exploration cards
  const artifacts: ExplorationCard[] = results.map((r: { title: string; url: string; snippet: string }) => ({
    id: `search_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'webpage' as const,
    title: r.title,
    source: r.url,
    snippet: r.snippet.slice(0, 200),
    timestamp: new Date().toISOString(),
  }));

  return {
    toolCallId: call.id,
    content: formatted || 'Nessun risultato trovato.',
    isError: false,
    artifacts,
  };
}

// ── Web Fetch ────────────────────────────────────────────────────────

async function executeWebFetch(base: string, call: ToolCall): Promise<ToolResult> {
  const { url, max_chars } = call.input as { url: string; max_chars?: number };

  const response = await fetch(`${base}/api/tools/web-fetch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, max_chars: max_chars || 8000 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    return {
      toolCallId: call.id,
      content: `Errore fetch pagina: ${err.error || err.detail || response.statusText}`,
      isError: true,
    };
  }

  const data = await response.json();

  // Crea exploration card per il contenuto
  const artifact: ExplorationCard = {
    id: `fetch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'webpage',
    title: data.title || url,
    source: url,
    snippet: (data.content || '').slice(0, 200),
    fullContent: data.content,
    timestamp: new Date().toISOString(),
  };

  return {
    toolCallId: call.id,
    content: `# ${data.title || 'Pagina web'}\nFonte: ${url}\nParole: ${data.wordCount || 0}\n\n${data.content || ''}`,
    isError: false,
    artifacts: [artifact],
  };
}

// ── Save Finding (client-side only) ──────────────────────────────────

function executeSaveFinding(call: ToolCall): ToolResult {
  const { title, content, source, type } = call.input as {
    title: string;
    content: string;
    source: string;
    type?: string;
  };

  const card: ExplorationCard = {
    id: `finding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: (type as ExplorationCard['type']) || 'summary',
    title,
    source,
    snippet: content.slice(0, 200),
    fullContent: content,
    timestamp: new Date().toISOString(),
    savedToTask: true,
  };

  return {
    toolCallId: call.id,
    content: `Trovata salvata: "${title}" da ${source}`,
    isError: false,
    artifacts: [card],
  };
}

// ── Tool Loop ────────────────────────────────────────────────────────

/**
 * Esegue un batch di tool calls e ritorna i risultati.
 * Usato dall'orchestrator nel loop tool_use.
 */
export async function executeToolBatch(calls: ToolCall[]): Promise<ToolResult[]> {
  // Esegui in parallelo
  return Promise.all(calls.map(call => executeToolCall(call)));
}

/**
 * Estrae ToolCall objects da tool_use blocks (formato Anthropic).
 */
export function extractToolCalls(toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }>): ToolCall[] {
  return toolUseBlocks.map(block => ({
    id: block.id,
    name: block.name,
    input: block.input,
  }));
}
