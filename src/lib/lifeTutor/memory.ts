/**
 * Life Tutor — Memory Module
 * Gestione memoria a 3 livelli con doppio storage (Supabase + localStorage fallback).
 */

import type {
  MemoryEntry, MemoryTag, MemorySummary,
  MemoryStats, LifeTutorConfig,
} from '../../types/lifeTutor';
import { generateId } from '../utils';
import { supabase, isSupabaseConfigured } from '../supabase';

// ── Storage Keys (localStorage fallback) ────────────────────────────

const MEMORIES_KEY = 'bt_ltm_memories';
const CONSOLIDATION_KEY = 'bt_ltm_last_consolidation';

// ── Helper: get workspace_id ────────────────────────────────────────

async function getWorkspaceId(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .single();
    return data?.id || null;
  } catch (err) { console.warn('[lt-memory] getWorkspaceId failed:', err); return null; }
}

// ── CRUD ─────────────────────────────────────────────────────────────

/** Load all memories (Supabase first, localStorage fallback) */
export async function loadAllMemories(): Promise<MemoryEntry[]> {
  const wsId = await getWorkspaceId();
  if (wsId && supabase) {
    try {
      const { data, error } = await supabase
        .from('lt_memories')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(dbToMemoryEntry);
      }
    } catch (err) { console.warn('[lt-memory] Supabase load failed, using localStorage:', err); }
  }
  return loadAllMemoriesLocal();
}

/** Sync: load from localStorage only (fast, for prompt building) */
export function loadAllMemoriesLocal(): MemoryEntry[] {
  try {
    const saved = localStorage.getItem(MEMORIES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) { console.warn('[lt-memory] localStorage parse failed:', err); }
  return [];
}

function saveAllMemoriesLocal(memories: MemoryEntry[]): void {
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
}

/** Add a single memory */
export async function addMemory(
  entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>
): Promise<MemoryEntry> {
  const memory: MemoryEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    accessCount: 0,
  };

  // Save to localStorage (always, for speed)
  const all = loadAllMemoriesLocal();
  all.push(memory);
  saveAllMemoriesLocal(all);

  // Save to Supabase (async, non-blocking)
  saveMemoryToSupabase(memory).catch(() => {});

  return memory;
}

/** Add multiple memories at once */
export async function addMemories(
  entries: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>[]
): Promise<MemoryEntry[]> {
  const all = loadAllMemoriesLocal();
  const created: MemoryEntry[] = [];
  for (const entry of entries) {
    const memory: MemoryEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0,
    };
    all.push(memory);
    created.push(memory);
  }
  saveAllMemoriesLocal(all);

  // Batch save to Supabase
  saveMemoriesToSupabase(created).catch(() => {});

  return created;
}

/** Delete a memory */
export async function deleteMemory(id: string): Promise<void> {
  const all = loadAllMemoriesLocal();
  saveAllMemoriesLocal(all.filter(m => m.id !== id));

  const wsId = await getWorkspaceId();
  if (wsId && supabase) {
    try { await supabase.from('lt_memories').delete().eq('id', id); } catch (err) { console.warn('[lt-memory] Supabase delete failed:', err); }
  }
}

/** Clear all memories */
export function clearAllMemories(): void {
  localStorage.removeItem(MEMORIES_KEY);
}

// ── Queries ──────────────────────────────────────────────────────────

/** Memoria recente: ultimi 7 giorni */
export function getRecentMemories(): MemoryEntry[] {
  const all = loadAllMemoriesLocal();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  return all
    .filter(m => m.layer === 'recent' || m.createdAt >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 30);
}

/** Memoria consolidata: cerca per tag */
export function getMemoriesByTags(tags: MemoryTag[], limit = 15): MemoryEntry[] {
  const all = loadAllMemoriesLocal();
  return all
    .filter(m => (m.layer === 'consolidated' || m.layer === 'recent') &&
      m.tags.some(t => tags.includes(t)))
    .sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.lastAccessedAt.localeCompare(a.lastAccessedAt);
    })
    .slice(0, limit);
}

/** Cerca per testo (full-text locale) */
export function searchMemories(query: string, limit = 20): MemoryEntry[] {
  const all = loadAllMemoriesLocal();
  const lowerQuery = query.toLowerCase();
  return all
    .filter(m =>
      m.content.toLowerCase().includes(lowerQuery) ||
      m.summary.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
}

/** Memorie per un corso specifico */
export function getMemoriesForCourse(courseId: string): MemoryEntry[] {
  const all = loadAllMemoriesLocal();
  return all
    .filter(m => m.courseId === courseId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Segna una memoria come acceduta */
export function touchMemory(id: string): void {
  const all = loadAllMemoriesLocal();
  const mem = all.find(m => m.id === id);
  if (mem) {
    mem.lastAccessedAt = new Date().toISOString();
    mem.accessCount++;
    saveAllMemoriesLocal(all);
  }
}

// ── Statistics ───────────────────────────────────────────────────────

export function getMemoryStats(memories: MemoryEntry[]): MemoryStats {
  const tagCounts: Record<string, number> = {};
  let oldestDate: string | null = null;
  let newestDate: string | null = null;
  const emotions: string[] = [];

  for (const m of memories) {
    for (const tag of m.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    if (!oldestDate || m.createdAt < oldestDate) oldestDate = m.createdAt;
    if (!newestDate || m.createdAt > newestDate) newestDate = m.createdAt;
    if (m.emotion) emotions.push(m.emotion);
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag as MemoryTag);

  const recentEmotions = emotions.slice(-10);
  const emotionCounts: Record<string, number> = {};
  for (const e of recentEmotions) {
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
  }
  const dominantEmotion = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutro';

  return {
    totalMemories: memories.length,
    oldestMemory: oldestDate,
    topTags,
    emotionalTrend: dominantEmotion,
    lastInteractionDate: newestDate,
  };
}

// ── Build Memory Summary ─────────────────────────────────────────────

export function buildMemorySummary(
  contextTags: MemoryTag[] = [],
  config?: LifeTutorConfig,
): MemorySummary {
  // Config inline per evitare dipendenze circolari
  const cfg = config || (() => {
    try {
      const saved = localStorage.getItem('bt_ltm_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { memoryDepth: 'standard', ...parsed };
      }
    } catch (err) { console.warn('[lt-memory] Config parse failed:', err); }
    return { memoryDepth: 'standard' as const };
  })();
  const allMemories = loadAllMemoriesLocal();
  const recentMemories = getRecentMemories();

  const relevantLimit = cfg.memoryDepth === 'minimal' ? 5
    : cfg.memoryDepth === 'deep' ? 25 : 15;
  const relevantMemories = contextTags.length > 0
    ? getMemoriesByTags(contextTags, relevantLimit)
    : [];

  for (const m of [...recentMemories, ...relevantMemories]) {
    touchMemory(m.id);
  }

  const stats = getMemoryStats(allMemories);

  const promptParts: string[] = [];
  promptParts.push('\n--- MEMORIA ---');
  promptParts.push(`Conosci questo studente da ${stats.totalMemories} interazioni.`);

  if (stats.emotionalTrend !== 'neutro') {
    promptParts.push(`Trend emotivo recente: ${stats.emotionalTrend}`);
  }

  if (recentMemories.length > 0) {
    promptParts.push('\nRICORDI RECENTI (ultimi giorni):');
    for (const m of recentMemories.slice(0, cfg.memoryDepth === 'minimal' ? 5 : 15)) {
      promptParts.push(`  - ${m.summary} [${m.tags.join(', ')}]`);
    }
  }

  if (relevantMemories.length > 0) {
    promptParts.push('\nRICORDI RILEVANTI AL CONTESTO:');
    for (const m of relevantMemories) {
      promptParts.push(`  - ${m.summary} (importanza: ${m.importance}/5)`);
    }
  }

  if (stats.topTags.length > 0) {
    promptParts.push(`\nArgomenti più discussi: ${stats.topTags.join(', ')}`);
  }

  return {
    recentMemories,
    relevantMemories,
    stats,
    promptText: promptParts.join('\n'),
  };
}

// ── Consolidation ────────────────────────────────────────────────────

export function consolidateMemories(): void {
  const lastConsolidation = localStorage.getItem(CONSOLIDATION_KEY);
  const now = new Date();

  if (lastConsolidation) {
    const last = new Date(lastConsolidation);
    const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return;
  }

  const all = loadAllMemoriesLocal();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  let changed = false;

  for (const m of all) {
    if (m.layer === 'recent' && m.createdAt < cutoff) {
      if (m.importance >= 3) {
        m.layer = 'consolidated';
      } else {
        m.layer = 'deep';
      }
      changed = true;
    }
  }

  if (changed) {
    saveAllMemoriesLocal(all);
  }

  localStorage.setItem(CONSOLIDATION_KEY, now.toISOString());
}

// ── Tag Detection ────────────────────────────────────────────────────

export function detectContextTags(text: string): MemoryTag[] {
  const lower = text.toLowerCase();
  const tags: MemoryTag[] = [];

  const tagKeywords: Record<MemoryTag, string[]> = {
    famiglia: ['famiglia', 'mamma', 'papà', 'figlio', 'figlia', 'moglie', 'marito', 'fratello', 'sorella', 'genitori', 'nonno', 'nonna', 'family', 'mother', 'father'],
    lavoro: ['lavoro', 'ufficio', 'collega', 'capo', 'azienda', 'stipendio', 'carriera', 'progetto', 'riunione', 'work', 'job', 'office', 'boss'],
    studio: ['esame', 'studio', 'università', 'corso', 'lezione', 'compito', 'voto', 'laurea', 'studente', 'exam', 'study', 'university'],
    emozione: ['triste', 'felice', 'arrabbiato', 'stressato', 'preoccupato', 'ansioso', 'depresso', 'emozionato', 'contento', 'sad', 'happy', 'angry', 'stressed'],
    successo: ['successo', 'vittoria', 'promosso', 'raggiunto', 'bravo', 'eccellente', 'fantastico', 'riuscito', 'completato', 'success', 'achieved'],
    difficolta: ['problema', 'difficoltà', 'non riesco', 'aiuto', 'fatica', 'sbagliato', 'errore', 'confuso', 'difficile', 'problem', 'difficult', 'help'],
    salute: ['salute', 'malato', 'dottore', 'ospedale', 'medicine', 'dolore', 'stanco', 'dormire', 'health', 'sick', 'doctor', 'tired'],
    hobby: ['hobby', 'sport', 'gioco', 'musica', 'film', 'libro', 'viaggio', 'cucina', 'arte', 'fotografia'],
    relazioni: ['amico', 'amica', 'ragazza', 'ragazzo', 'fidanzato', 'fidanzata', 'relazione', 'amicizia', 'friend', 'relationship'],
    obiettivi: ['obiettivo', 'sogno', 'piano', 'futuro', 'vorrei', 'spero', 'goal', 'dream', 'plan', 'future', 'want'],
    evento: ['compleanno', 'matrimonio', 'vacanza', 'festa', 'concerto', 'viaggio', 'evento', 'birthday', 'wedding', 'vacation', 'event'],
    preferenza: ['preferisco', 'mi piace', 'adoro', 'odio', 'detesto', 'favorito', 'prefer', 'like', 'love', 'hate', 'favorite'],
    opinione: ['penso', 'credo', 'secondo me', 'ritengo', 'think', 'believe', 'opinion'],
    aneddoto: ['ricordo quando', 'una volta', 'mi è successo', 'racconto', 'story', 'remember when'],
    progresso: ['migliorato', 'progresso', 'imparato', 'capito', 'padroneggiato', 'improved', 'progress', 'learned'],
    altro: [],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(tag as MemoryTag);
    }
  }

  return tags.length > 0 ? tags : ['altro'];
}

// ── Supabase Helpers ─────────────────────────────────────────────────

function memoryEntryToDb(m: MemoryEntry, workspaceId: string) {
  return {
    id: m.id,
    workspace_id: workspaceId,
    content: m.content,
    summary: m.summary,
    tags: m.tags,
    importance: m.importance,
    emotion: m.emotion || null,
    layer: m.layer,
    source: m.source,
    course_id: m.courseId || null,
    maestro_id: m.maestroId || null,
    conversation_id: m.conversationId || null,
    access_count: m.accessCount,
    last_accessed_at: m.lastAccessedAt,
    created_at: m.createdAt,
  };
}

function dbToMemoryEntry(row: Record<string, unknown>): MemoryEntry {
  return {
    id: row.id as string,
    content: row.content as string,
    summary: row.summary as string,
    tags: ((row.tags as string[]) || []) as MemoryTag[],
    importance: row.importance as number,
    emotion: (row.emotion as string) || undefined,
    layer: row.layer as MemoryEntry['layer'],
    source: row.source as MemoryEntry['source'],
    courseId: (row.course_id as string) || undefined,
    maestroId: (row.maestro_id as string) || undefined,
    conversationId: (row.conversation_id as string) || undefined,
    createdAt: row.created_at as string,
    lastAccessedAt: row.last_accessed_at as string,
    accessCount: row.access_count as number,
  };
}

async function saveMemoryToSupabase(memory: MemoryEntry): Promise<void> {
  const wsId = await getWorkspaceId();
  if (!wsId || !supabase) return;
  await supabase.from('lt_memories').upsert(memoryEntryToDb(memory, wsId));
}

async function saveMemoriesToSupabase(memories: MemoryEntry[]): Promise<void> {
  const wsId = await getWorkspaceId();
  if (!wsId || !supabase || memories.length === 0) return;
  await supabase.from('lt_memories').upsert(memories.map(m => memoryEntryToDb(m, wsId)));
}
