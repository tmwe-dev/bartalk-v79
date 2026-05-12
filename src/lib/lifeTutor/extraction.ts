/**
 * Life Tutor — Extraction Module
 * Estrazione AI-powered di memorie, insight e aggiornamenti profilo dalle conversazioni.
 */

import type { MemorySource, ExtractionResult } from '../../types/lifeTutor';
import { callProxy } from '../proxy';
import { resolveApiKey, PRIORITY_ORDERS } from '../apiKeyResolver';
import { addMemories } from './memory';
import { mergeProfileUpdates } from './profile';
import { isLifeTutorEnabled } from './config';

// ── Extraction Prompt ────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Sei un analista di conversazioni per il sistema Life Tutor. Il tuo compito è estrarre INFORMAZIONI SIGNIFICATIVE da questa conversazione.

Per ogni ricordo, fornisci:
- content: il ricordo completo (1-3 frasi)
- summary: riassunto brevissimo (max 80 caratteri)
- tags: array di tag tra: famiglia, lavoro, studio, emozione, successo, difficolta, salute, hobby, relazioni, obiettivi, evento, preferenza, opinione, aneddoto, progresso, altro
- importance: 1-5 (5 = fatto cruciale sulla vita della persona)
- emotion: stato emotivo associato (felice, triste, ansioso, motivato, frustrato, soddisfatto, neutro, eccitato, pensieroso)
- layer: "recent" per fatti recenti, "consolidated" per fatti importanti permanenti

Estrai ANCHE:
- profileUpdates: aggiornamenti al profilo (nome, occupazione, hobby, sfide, etc.)
- insights: scoperte, preoccupazioni, progressi, suggerimenti
- objectiveUpdates: obiettivi menzionati o aggiornati

Estrai SOLO fatti personali significativi:
✅ Fatti sulla vita (lavoro, famiglia, eventi)
✅ Emozioni intense o ricorrenti
✅ Obiettivi e aspirazioni
✅ Problemi o sfide personali
✅ Successi e traguardi
✅ Preferenze e opinioni forti
✅ Progressi nell'apprendimento
✅ Informazioni identificative (nome, età, occupazione)

❌ NON estrarre:
❌ Contenuto didattico generico
❌ Domande tecniche senza contesto personale
❌ Saluti e convenevoli

Rispondi SOLO con JSON valido:
{
  "memories": [...],
  "conversationSummary": "breve riassunto",
  "overallEmotion": "stato emotivo dominante",
  "insights": [{ "type": "discovery|concern|progress|suggestion", "content": "..." }],
  "profileUpdates": { "displayName": "...", "occupation": "...", ... },
  "objectiveUpdates": [{ "title": "...", "progress": 50, "status": "active" }]
}

NOTA: profileUpdates e objectiveUpdates sono opzionali. Includili solo se presenti nella conversazione.`;

// ── Extract Memories from Conversation ───────────────────────────────

export async function extractMemoriesFromConversation(
  messages: { role: string; content: string }[],
  source: MemorySource,
  courseId?: string,
  maestroId?: string,
): Promise<ExtractionResult | null> {
  if (messages.length < 2) return null;

  const recentMsgs = messages.slice(-30);
  const conversationText = recentMsgs
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n');

  const apiConfig = resolveApiKey(undefined, undefined, PRIORITY_ORDERS.fast);
  if (!apiConfig) return null;

  try {
    const response = await callProxy({
      provider: apiConfig.provider,
      model: apiConfig.model,
      messages: [{ role: 'user', content: `Analizza questa conversazione ed estrai le informazioni significative:\n\n${conversationText}` }],
      systemPrompt: EXTRACTION_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 4096,
      apiKey: apiConfig.apiKey,
    });

    if (response.error) {
      console.error('[LifeTutor] Errore estrazione:', response.error);
      return null;
    }

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ExtractionResult;

    // Enrich memories with source info
    const enrichedMemories = parsed.memories.map(m => ({
      ...m,
      source,
      courseId,
      maestroId,
    }));

    return {
      ...parsed,
      memories: enrichedMemories,
    };
  } catch (err) {
    console.error('[LifeTutor] Errore parsing estrazione:', err);
    return null;
  }
}

// ── Process Conversation (extract + save + update profile) ───────────

export async function processConversationMemories(
  messages: { role: string; content: string }[],
  source: MemorySource,
  courseId?: string,
  maestroId?: string,
): Promise<number> {
  if (!isLifeTutorEnabled()) return 0;

  const result = await extractMemoriesFromConversation(messages, source, courseId, maestroId);
  if (!result || result.memories.length === 0) return 0;

  // Save memories
  addMemories(result.memories);

  // Update profile if there are profile updates
  if (result.profileUpdates && Object.keys(result.profileUpdates).length > 0) {
    mergeProfileUpdates(result.profileUpdates).catch(() => {});
  }

  return result.memories.length;
}
