/**
 * @module lifeTutor/proactivity
 * Life Tutor proactive suggestion engine.
 * Generates AI-powered personalized suggestions based on user profile,
 * memories, objectives, and emotional trends. Rate-limited to max once per 4 hours.
 */

import type {
  LTAISuggestion, SuggestionType,
  LTObjective,
} from '../../types/lifeTutor';
import { generateId } from '../utils';
import { callProxy } from '../proxy';
import { resolveApiKey, PRIORITY_ORDERS } from '../apiKeyResolver';
import { loadAllMemoriesLocal, getMemoryStats } from './memory';
import { loadProfileLocal } from './profile';

const SUGGESTIONS_KEY = 'bt_lt_suggestions';
const LAST_SUGGESTION_KEY = 'bt_lt_last_suggestion_at';

// ── Load / Save Suggestions ──────────────────────────────────────────

/**
 * Loads suggestions from storage.
 * @returns LTAISuggestion[]
 */
export function loadSuggestions(): LTAISuggestion[] {
  try {
    const saved = localStorage.getItem(SUGGESTIONS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveSuggestions(suggestions: LTAISuggestion[]): void {
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
}

export function getPendingSuggestions(): LTAISuggestion[] {
  return loadSuggestions().filter(s => s.status === 'pending');
}

export function respondToSuggestion(id: string, accepted: boolean): void {
  const all = loadSuggestions();
  const suggestion = all.find(s => s.id === id);
  if (suggestion) {
    suggestion.status = accepted ? 'accepted' : 'dismissed';
    suggestion.respondedAt = new Date().toISOString();
    saveSuggestions(all);
  }
}

/**
 * Marks suggestion shown.
 * @param id - The id parameter
 */
export function markSuggestionShown(id: string): void {
  const all = loadSuggestions();
  const suggestion = all.find(s => s.id === id);
  if (suggestion && suggestion.status === 'pending') {
    suggestion.status = 'shown';
    suggestion.shownAt = new Date().toISOString();
    saveSuggestions(all);
  }
}

// ── Generate Suggestions ─────────────────────────────────────────────

/**
 * Genera suggerimenti proattivi basati sul contesto dell'utente.
 * Chiamare periodicamente (all'apertura dell'app, dopo sessioni, etc.)
 * Limita a max 1 generazione ogni 4 ore.
 */
export async function generateProactiveSuggestions(
  objectives: LTObjective[] = [],
): Promise<LTAISuggestion[]> {
  // Rate limit: max 1 volta ogni 4 ore
  const lastGen = localStorage.getItem(LAST_SUGGESTION_KEY);
  if (lastGen) {
    const hoursSince = (Date.now() - new Date(lastGen).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 4) return [];
  }

  const profile = loadProfileLocal();
  const memories = loadAllMemoriesLocal();
  const stats = getMemoryStats(memories);

  if (memories.length < 3 && !profile) return []; // Troppo poco contesto

  const apiConfig = resolveApiKey(undefined, undefined, PRIORITY_ORDERS.fast);
  if (!apiConfig) return [];

  const contextParts: string[] = [];

  // Profile context
  if (profile) {
    contextParts.push(`PROFILO: ${profile.displayName || 'Utente'}, ${profile.occupation || 'occupazione sconosciuta'}`);
    if (profile.lifeContext.hobbies.length > 0) {
      contextParts.push(`Hobby: ${profile.lifeContext.hobbies.join(', ')}`);
    }
    if (profile.lifeContext.currentChallenges.length > 0) {
      contextParts.push(`Sfide: ${profile.lifeContext.currentChallenges.join(', ')}`);
    }
    contextParts.push(`Sessioni totali: ${profile.growthMetrics.totalSessions}`);
    contextParts.push(`Trend engagement: ${profile.growthMetrics.engagementTrend}`);
  }

  // Recent memories
  const recentMems = memories
    .filter(m => m.layer === 'recent')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);
  if (recentMems.length > 0) {
    contextParts.push(`\nRICORDI RECENTI:`);
    for (const m of recentMems) {
      contextParts.push(`- ${m.summary} [${m.tags.join(',')}] (importanza: ${m.importance})`);
    }
  }

  // Stats
  contextParts.push(`\nSTATISTICHE: ${stats.totalMemories} memorie totali`);
  contextParts.push(`Tag più frequenti: ${stats.topTags.join(', ')}`);
  contextParts.push(`Trend emotivo: ${stats.emotionalTrend}`);

  // Objectives
  if (objectives.length > 0) {
    contextParts.push(`\nOBIETTIVI ATTIVI:`);
    for (const obj of objectives.filter(o => o.status === 'active').slice(0, 5)) {
      contextParts.push(`- ${obj.title} (progresso: ${obj.progress}%, priorità: ${obj.priority})`);
    }
  }

  const systemPrompt = `Sei il motore di proattività del Life Tutor. Basandoti sul contesto dell'utente, genera 2-3 suggerimenti INTELLIGENTI e PERSONALIZZATI.

Tipi di suggerimento disponibili:
- topic_exploration: proponi un nuovo argomento da esplorare
- skill_reinforcement: rinforza una competenza debole
- emotional_support: supporto emotivo proattivo
- objective_reminder: ricorda un obiettivo
- achievement_celebration: celebra un traguardo raggiunto
- habit_suggestion: suggerisci un'abitudine positiva
- conversation_starter: apri una conversazione su un tema interessante
- review_suggestion: suggerisci un ripasso
- challenge_proposal: proponi una sfida

REGOLE:
- Ogni suggerimento deve essere CONCRETO e basato su dati reali dell'utente
- Il "reasoning" deve spiegare PERCHÉ stai suggerendo questo (collega ai dati)
- NON suggerire cose generiche — personalizza al massimo
- Se l'utente è in difficoltà emotiva, prioritizza il supporto
- Se ha obiettivi non raggiunti, ricordaglieli con gentilezza
- Se non interagisce da tempo, proponi un conversation_starter accattivante

Rispondi SOLO con JSON:
{
  "suggestions": [
    {
      "suggestionType": "...",
      "title": "titolo breve accattivante",
      "content": "descrizione del suggerimento (2-3 frasi)",
      "reasoning": "perché suggerisco questo",
      "priority": 1-5,
      "contextTags": ["tag1", "tag2"]
    }
  ]
}`;

  try {
    const response = await callProxy({
      provider: apiConfig.provider,
      model: apiConfig.model,
      messages: [{ role: 'user', content: `Genera suggerimenti proattivi per questo utente:\n\n${contextParts.join('\n')}` }],
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
      apiKey: apiConfig.apiKey,
    });

    if (response.error) return [];

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestions: Array<{
        suggestionType: SuggestionType;
        title: string;
        content: string;
        reasoning: string;
        priority: number;
        contextTags: string[];
      }>;
    };

    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 giorni

    const newSuggestions: LTAISuggestion[] = parsed.suggestions.map(s => ({
      id: generateId(),
      workspaceId: profile?.workspaceId || 'local',
      suggestionType: s.suggestionType,
      title: s.title,
      content: s.content,
      reasoning: s.reasoning,
      priority: Math.min(5, Math.max(1, s.priority)),
      contextTags: s.contextTags,
      status: 'pending' as const,
      shownAt: null,
      respondedAt: null,
      expiresAt: expires,
      createdAt: now,
    }));

    // Save
    const all = loadSuggestions();
    // Rimuovi suggerimenti scaduti
    const active = all.filter(s =>
      s.status !== 'expired' &&
      (!s.expiresAt || s.expiresAt > now)
    );
    saveSuggestions([...active, ...newSuggestions]);
    localStorage.setItem(LAST_SUGGESTION_KEY, now);

    return newSuggestions;
  } catch (err) {
    console.error('[LifeTutor] Errore generazione suggerimenti:', err);
    return [];
  }
}

// ── Build Suggestions Prompt Section ─────────────────────────────────

/**
 * Builds suggestions prompt section.
 * @param suggestions - The suggestions parameter
 * @returns string
 */
export function buildSuggestionsPromptSection(suggestions: LTAISuggestion[]): string {
  const pending = suggestions.filter(s => s.status === 'pending' || s.status === 'shown');
  if (pending.length === 0) return '';

  const parts: string[] = [];
  parts.push('\n--- SUGGERIMENTI PROATTIVI ---');
  parts.push('Hai questi suggerimenti pronti da proporre al momento giusto:');
  for (const s of pending.slice(0, 3)) {
    parts.push(`• [${s.suggestionType}] ${s.title}: ${s.content}`);
  }
  parts.push('Integra UNO di questi suggerimenti nella conversazione se il momento è appropriato.');
  parts.push('NON forzare — aspetta il momento giusto o proponi alla fine della conversazione.');

  return parts.join('\n');
}
