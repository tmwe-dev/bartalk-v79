/**
 * BarTalk v8 — Life Tutor Memory (Backward Compatibility Barrel)
 *
 * Questo file re-esporta dal nuovo modulo lifeTutor/ per mantenere
 * la compatibilità con gli import esistenti.
 *
 * @deprecated Usare import da './lifeTutor' o './lifeTutor/memory' direttamente.
 */

// Config
export { loadLifeTutorConfig, saveLifeTutorConfig, isLifeTutorEnabled } from './lifeTutor/config';

// Memory
export {
  loadAllMemoriesLocal as loadAllMemories,
  addMemory, addMemories,
  deleteMemory, clearAllMemories,
  getRecentMemories, getMemoriesByTags, searchMemories,
  getMemoriesForCourse, touchMemory,
  buildMemorySummary, consolidateMemories, detectContextTags,
} from './lifeTutor/memory';

// Extraction (AI-powered memory extraction)
export {
  extractMemoriesFromConversation,
  processConversationMemories,
} from './lifeTutor/extraction';

// Prompt (backward compatible — the new version has more params but defaults work)
export { buildLifeTutorPromptAddon } from './lifeTutor/prompt';
