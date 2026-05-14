/**
 * @module lifeTutor/config
 * Life Tutor configuration management.
 * Loads, saves, and queries the Life Tutor feature toggle and settings
 * from localStorage with default fallbacks.
 */

import type { LifeTutorConfig } from '../../types/lifeTutor';
import { DEFAULT_LIFE_TUTOR_CONFIG } from '../../types/lifeTutor';

const CONFIG_KEY = 'bt_ltm_config';

export function loadLifeTutorConfig(): LifeTutorConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge con defaults per nuovi campi aggiunti
      return { ...DEFAULT_LIFE_TUTOR_CONFIG, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_LIFE_TUTOR_CONFIG };
}

export function saveLifeTutorConfig(config: LifeTutorConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isLifeTutorEnabled(): boolean {
  return loadLifeTutorConfig().enabled;
}
