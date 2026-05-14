/**
 * @module lifeTutor/index
 * Life Tutor barrel exports aggregating all submodules:
 * config, memory, profile, KB, extraction, proactivity, prompt, and processor.
 */

// Config
export { loadLifeTutorConfig, saveLifeTutorConfig, isLifeTutorEnabled } from './config';

// Memory
export {
  loadAllMemories, loadAllMemoriesLocal,
  addMemory, addMemories,
  deleteMemory, clearAllMemories,
  getRecentMemories, getMemoriesByTags, searchMemories,
  getMemoriesForCourse, touchMemory,
  getMemoryStats, buildMemorySummary,
  consolidateMemories, detectContextTags,
} from './memory';

// Profile
export {
  loadProfile, loadProfileLocal, saveProfile,
  getOrCreateProfile, mergeProfileUpdates,
  incrementGrowthMetrics, buildProfilePromptSection,
} from './profile';

// Knowledge Base
export {
  loadKBEntries, getKBByType, getKBByTags,
  buildKBPromptSection, buildFullKBContext,
  saveUserKBEntry, addUserKBEntry,
} from './kb';

// Extraction (AI-powered memory extraction)
export { extractMemoriesFromConversation, processConversationMemories } from './extraction';

// Proactivity (AI-powered suggestions)
export { loadSuggestions, getPendingSuggestions, respondToSuggestion, markSuggestionShown,
  generateProactiveSuggestions, buildSuggestionsPromptSection } from './proactivity';

// Prompt Builder
export {
  buildLifeTutorPromptAddon,
  buildLightLifeTutorAddon,
} from './prompt';

// KB Processor (Pre-Routing Engine)
export {
  processMessageForKB,
  buildIdentityInjection,
  getKBInventory,
} from './processor';
export type { ProcessorResult, ProcessorContext } from './processor';
