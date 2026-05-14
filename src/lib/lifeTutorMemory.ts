/**
 * @module lifeTutorMemory
 * Backward compatibility barrel re-exporting Life Tutor modules from
 * the new lifeTutor/ directory structure. Prefer importing from './lifeTutor' directly.
 * @deprecated Use imports from './lifeTutor' or './lifeTutor/memory' instead.
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
