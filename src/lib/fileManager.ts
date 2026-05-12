/**
 * BarTalk v8 — File Manager
 * Gestione file avanzata con dual persistence:
 * - Supabase Storage (utenti autenticati): fino a 10MB per file
 * - localStorage (skip mode): solo testo, max 500KB
 *
 * Supporta: PDF, immagini, CSV, Excel, JSON, testo, codice
 *
 * @deprecated Modulo attualmente non integrato nel codebase.
 * Mantenuto per futura integrazione upload file nelle conversazioni.
 * Nessun file importa da questo modulo (verificato 2026-03-07).
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { AttachedFile } from '../types/tasks';
import type { ExplorationCard } from '../types/tools';

// ── Constants ────────────────────────────────────────────────────────

const BUCKET_NAME = 'task-files';
const MAX_FILE_SIZE_SUPABASE = 10 * 1024 * 1024;  // 10MB
const MAX_FILE_SIZE_LOCAL = 500 * 1024;             // 500KB
const MAX_FILES_PER_TASK = 20;

const SUPPORTED_TYPES = [
  // Testo e codice
  '.txt', '.csv', '.md', '.json', '.xml', '.html', '.js', '.ts', '.py', '.log',
  '.css', '.yml', '.yaml', '.toml', '.env', '.sh', '.sql',
  // Documenti
  '.pdf',
  // Immagini
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  // Dati
  '.xlsx', '.xls',
];

const TEXT_EXTENSIONS = [
  '.txt', '.csv', '.md', '.json', '.xml', '.html', '.js', '.ts', '.py', '.log',
  '.css', '.yml', '.yaml', '.toml', '.env', '.sh', '.sql',
];

// ── Helpers ──────────────────────────────────────────────────────────

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

function isTextFile(filename: string): boolean {
  return TEXT_EXTENSIONS.includes(getFileExtension(filename));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── File Validation ──────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File, isDBMode: boolean): FileValidationResult {
  const ext = getFileExtension(file.name);
  const maxSize = isDBMode ? MAX_FILE_SIZE_SUPABASE : MAX_FILE_SIZE_LOCAL;

  if (!SUPPORTED_TYPES.includes(ext)) {
    return { valid: false, error: `Tipo file non supportato: ${ext}. Tipi supportati: ${SUPPORTED_TYPES.join(', ')}` };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File troppo grande (${formatFileSize(file.size)}). Massimo: ${formatFileSize(maxSize)}` };
  }

  if (!isDBMode && !isTextFile(file.name)) {
    return { valid: false, error: `In modalità locale, solo file di testo sono supportati. Accedi con Supabase per caricare ${ext}` };
  }

  return { valid: true };
}

export function validateFileCount(currentCount: number): FileValidationResult {
  if (currentCount >= MAX_FILES_PER_TASK) {
    return { valid: false, error: `Massimo ${MAX_FILES_PER_TASK} file per task raggiunto.` };
  }
  return { valid: true };
}

// ── File Reading ─────────────────────────────────────────────────────

/**
 * Legge un file come testo (per file di testo) o come base64 (per binari).
 * Ritorna un AttachedFile pronto per il contesto.
 */
export async function readFileAsAttachment(file: File): Promise<AttachedFile> {
  const content = isTextFile(file.name)
    ? await file.text()
    : `[File binario: ${file.name} (${formatFileSize(file.size)})]`;

  return {
    id: generateFileId(),
    name: file.name,
    content,
    type: file.type || 'application/octet-stream',
    size: file.size,
    addedAt: new Date().toISOString(),
  };
}

// ── Supabase Storage ─────────────────────────────────────────────────

/**
 * Upload file to Supabase Storage bucket.
 * Path format: {workspaceId}/{taskId}/{fileId}_{filename}
 */
export async function uploadToSupabase(
  file: File,
  workspaceId: string,
  taskId: string,
): Promise<{ path: string; publicUrl?: string } | null> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn('[fileManager] Supabase non configurato, skip upload.');
    return null;
  }

  try {
    const fileId = generateFileId();
    const path = `${workspaceId}/${taskId}/${fileId}_${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[fileManager] Upload error:', error);
      return null;
    }

    // Get public URL (se bucket è pubblico)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      path,
      publicUrl: urlData?.publicUrl,
    };
  } catch (err) {
    console.error('[fileManager] Upload exception:', err);
    return null;
  }
}

/**
 * Elimina file da Supabase Storage.
 */
export async function deleteFromSupabase(path: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('[fileManager] Delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[fileManager] Delete exception:', err);
    return false;
  }
}

// ── Exploration Card → AttachedFile ──────────────────────────────────

/**
 * Converte una ExplorationCard in un AttachedFile salvabile nel task.
 */
export function explorationCardToFile(card: ExplorationCard): AttachedFile {
  const content = card.fullContent || card.snippet;
  const name = `${card.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50)}.md`;

  const markdown = `# ${card.title}\n\n**Fonte:** ${card.source}\n**Tipo:** ${card.type}\n**Data:** ${card.timestamp}\n${card.agentName ? `**Trovato da:** ${card.agentName}\n` : ''}\n---\n\n${content}`;

  return {
    id: generateFileId(),
    name,
    content: markdown,
    type: 'text/markdown',
    size: new Blob([markdown]).size,
    addedAt: new Date().toISOString(),
  };
}

// ── Export constants ──────────────────────────────────────────────────

export {
  SUPPORTED_TYPES,
  MAX_FILE_SIZE_SUPABASE,
  MAX_FILE_SIZE_LOCAL,
  MAX_FILES_PER_TASK,
  formatFileSize,
  isTextFile,
  getFileExtension,
};
