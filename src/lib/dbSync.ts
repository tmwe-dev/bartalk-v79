/**
 * BarTalk v8.2 — DB ↔ localStorage Sync
 * Sincronizza agentFreedom e structuredPrompts con Supabase
 * quando l'utente è autenticato.
 *
 * Pattern: "DB-first, localStorage-cache"
 * - Pull: DB → localStorage al login
 * - Push: localStorage → DB ad ogni modifica
 * - Fallback: solo localStorage in skip mode
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { AgentFreedomConfig, FreedomLevel } from './agentFreedom';
import { loadFreedomConfigs, saveFreedomConfigs } from './agentFreedom';
import {
  loadSystemPrompts, loadPersonalitySections, loadComposedPrompts,
  type SystemPromptTemplate, type PersonalitySection, type ComposedPrompt,
} from './structuredPrompts';

// ── Helpers ─────────────────────────────────────────────────────────

async function getSession() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}

// ── Agent Freedom Sync ──────────────────────────────────────────────

/**
 * Pull freedom configs from DB → localStorage
 */
export async function pullFreedomConfigs(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('user_agent_configs')
      .select('agent_id, freedom_level, custom_instructions')
      .eq('user_id', userId);

    if (error) {
      console.warn('[dbSync] Errore pull freedom configs:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const configs: AgentFreedomConfig[] = data.map(row => ({
        agentId: row.agent_id,
        level: row.freedom_level as FreedomLevel,
        customInstructions: row.custom_instructions || undefined,
      }));
      saveFreedomConfigs(configs);
      console.log(`[dbSync] Pull freedom configs: ${configs.length} agenti`);
    }
  } catch (err) {
    console.warn('[dbSync] Errore pull freedom:', err);
  }
}

/**
 * Push freedom configs from localStorage → DB
 */
export async function pushFreedomConfigs(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const configs = loadFreedomConfigs();

    for (const config of configs) {
      await supabase
        .from('user_agent_configs')
        .upsert({
          user_id: userId,
          agent_id: config.agentId,
          freedom_level: config.level,
          custom_instructions: config.customInstructions || null,
        }, { onConflict: 'user_id,agent_id' });
    }

    console.log(`[dbSync] Push freedom configs: ${configs.length} agenti`);
  } catch (err) {
    console.warn('[dbSync] Errore push freedom:', err);
  }
}

// ── Structured Prompts Sync ─────────────────────────────────────────

/**
 * Pull system prompts from DB → localStorage
 */
export async function pullSystemPrompts(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('*')
      .or(`user_id.eq.${userId},is_global.eq.true`);

    if (error) {
      console.warn('[dbSync] Errore pull system prompts:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const prompts: SystemPromptTemplate[] = data.map(row => ({
        id: row.id,
        name: row.name,
        content: row.content,
        isDefault: row.is_default,
        createdAt: row.created_at,
      }));
      localStorage.setItem('bartalk_system_prompts', JSON.stringify(prompts));
      console.log(`[dbSync] Pull system prompts: ${prompts.length}`);
    }
  } catch (err) {
    console.warn('[dbSync] Errore pull system prompts:', err);
  }
}

/**
 * Push system prompts from localStorage → DB
 */
export async function pushSystemPrompts(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const prompts = loadSystemPrompts();

    for (const prompt of prompts) {
      await supabase
        .from('chat_laboratory_system_prompts')
        .upsert({
          id: prompt.id === 'default' ? undefined : prompt.id, // let DB generate UUID for default
          user_id: userId,
          name: prompt.name,
          content: prompt.content,
          is_default: prompt.isDefault,
        }, { onConflict: 'id' })
        .select();
    }

    console.log(`[dbSync] Push system prompts: ${prompts.length}`);
  } catch (err) {
    console.warn('[dbSync] Errore push system prompts:', err);
  }
}

/**
 * Pull personality sections from DB → localStorage
 */
export async function pullPersonalitySections(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'personality');

    if (error) {
      console.warn('[dbSync] Errore pull personalities:', error.message);
      return;
    }

    if (data) {
      const sections: PersonalitySection[] = data.map(row => ({
        id: row.id,
        agentId: row.agent_id || '',
        name: row.title,
        content: row.content,
        isActive: row.enabled,
        createdAt: row.created_at,
      }));
      localStorage.setItem('bartalk_personality_sections', JSON.stringify(sections));
      console.log(`[dbSync] Pull personality sections: ${sections.length}`);
    }
  } catch (err) {
    console.warn('[dbSync] Errore pull personalities:', err);
  }
}

/**
 * Push personality sections from localStorage → DB
 */
export async function pushPersonalitySections(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const sections = loadPersonalitySections();

    for (const section of sections) {
      await supabase
        .from('chat_laboratory_prompt_sections')
        .upsert({
          id: section.id,
          user_id: userId,
          type: 'personality',
          title: section.name,
          content: section.content,
          agent_id: section.agentId || null,
          enabled: section.isActive,
        }, { onConflict: 'id' });
    }

    console.log(`[dbSync] Push personality sections: ${sections.length}`);
  } catch (err) {
    console.warn('[dbSync] Errore push personalities:', err);
  }
}

/**
 * Pull composed prompts from DB → localStorage
 */
export async function pullComposedPrompts(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('chat_laboratory_composed_prompts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[dbSync] Errore pull composed prompts:', error.message);
      return;
    }

    if (data) {
      const prompts: ComposedPrompt[] = data.map(row => ({
        id: row.id,
        name: row.name,
        systemPromptId: row.system_prompt_id || '',
        personalitySectionIds: row.personality_section_ids || [],
        additionalContext: row.additional_context || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      localStorage.setItem('bartalk_composed_prompts', JSON.stringify(prompts));

      // Sync active composed prompt
      const active = data.find(r => r.is_active);
      if (active) {
        localStorage.setItem('bartalk_active_composed_prompt', active.id);
      }

      console.log(`[dbSync] Pull composed prompts: ${prompts.length}`);
    }
  } catch (err) {
    console.warn('[dbSync] Errore pull composed prompts:', err);
  }
}

/**
 * Push composed prompts from localStorage → DB
 */
export async function pushComposedPrompts(): Promise<void> {
  const userId = await getUserId();
  if (!userId || !supabase) return;

  try {
    const prompts = loadComposedPrompts();
    const activeId = localStorage.getItem('bartalk_active_composed_prompt');

    for (const prompt of prompts) {
      await supabase
        .from('chat_laboratory_composed_prompts')
        .upsert({
          id: prompt.id,
          user_id: userId,
          name: prompt.name,
          system_prompt_id: prompt.systemPromptId || null,
          personality_section_ids: prompt.personalitySectionIds,
          additional_context: prompt.additionalContext || null,
          is_active: prompt.id === activeId,
        }, { onConflict: 'id' });
    }

    console.log(`[dbSync] Push composed prompts: ${prompts.length}`);
  } catch (err) {
    console.warn('[dbSync] Errore push composed prompts:', err);
  }
}

// ── Full Sync Operations ────────────────────────────────────────────

/**
 * Pull tutto da DB → localStorage. Da chiamare al login.
 */
export async function pullAllFromDB(): Promise<void> {
  console.log('[dbSync] Pull completo da DB...');
  await Promise.all([
    pullFreedomConfigs(),
    pullSystemPrompts(),
    pullPersonalitySections(),
    pullComposedPrompts(),
  ]);
  console.log('[dbSync] Pull completo terminato.');
}

/**
 * Push tutto da localStorage → DB. Da chiamare dopo modifiche bulk.
 */
export async function pushAllToDB(): Promise<void> {
  console.log('[dbSync] Push completo a DB...');
  await Promise.all([
    pushFreedomConfigs(),
    pushSystemPrompts(),
    pushPersonalitySections(),
    pushComposedPrompts(),
  ]);
  console.log('[dbSync] Push completo terminato.');
}
