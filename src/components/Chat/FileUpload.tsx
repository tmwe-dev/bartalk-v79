/**
 * BarTalk v8.2 — FileUpload Component
 * Drag-and-drop + click per caricare file nella chat.
 * Supporta: PDF, DOCX, XLSX, XLS, CSV, TXT, MD, immagini.
 * Parsing lato client con fallback per formati non supportati.
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import './FileUpload.css';

// ── Tipi supportati ─────────────────────────────────────────────────
const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.xls,.csv,.txt,.md,.jpg,.jpeg,.png,.gif,.webp';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ParsedFile {
  name: string;
  type: string;
  size: number;
  content: string; // testo estratto o base64 per immagini
  preview?: string; // anteprima breve
}

interface FileUploadProps {
  onFilesParsed: (files: ParsedFile[]) => void;
  disabled?: boolean;
  compact?: boolean; // mini-mode per inline chat
}

// ── Parser functions ────────────────────────────────────────────────

async function parseTextFile(file: File): Promise<string> {
  return await file.text();
}

async function parseCSV(file: File): Promise<string> {
  const text = await file.text();
  // Simple CSV to readable format
  const lines = text.split('\n').slice(0, 100); // limit to 100 rows
  return lines.join('\n') + (text.split('\n').length > 100 ? '\n... (troncato a 100 righe)' : '');
}

async function parseImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Rimuovi il prefisso data:...;base64,
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parsing server-side per PDF, DOCX, XLSX via /api/parse-file
 */
async function parseServerSide(file: File): Promise<{ text: string; pages?: number; sheets?: string[] }> {
  const base64 = await fileToBase64Raw(file);

  const res = await fetch('/api/parse-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      data: base64,
      mimeType: file.type,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * AI-enhanced preprocessing — riorganizza il testo estratto usando AI
 * per ottenere un parsing perfetto (pulizia artefatti, struttura, formattazione).
 * Se l'AI non è disponibile, ritorna il testo originale.
 */
async function aiPreprocess(text: string, filename: string, fileType: string): Promise<string> {
  try {
    const res = await fetch('/api/ai-preprocess-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, filename, fileType }),
    });

    if (!res.ok) return text; // fallback silenzioso

    const data = await res.json();
    return data.text || text;
  } catch {
    // AI preprocessing è opzionale — mai bloccare il flusso
    return text;
  }
}

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let content = '';
  let preview = '';

  try {
    switch (ext) {
      case 'txt':
      case 'md':
        content = await parseTextFile(file);
        preview = content.slice(0, 200);
        break;

      case 'csv':
        content = await parseCSV(file);
        preview = content.split('\n').slice(0, 3).join('\n');
        break;

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        content = await parseImageToBase64(file);
        preview = `[Immagine: ${file.name} (${formatSize(file.size)})]`;
        break;

      case 'pdf': {
        const result = await parseServerSide(file);
        // AI preprocessing: pulisce artefatti di parsing, ristruttura il testo
        content = await aiPreprocess(result.text, file.name, 'pdf');
        preview = result.pages
          ? `[PDF: ${file.name} — ${result.pages} pagine] ${content.slice(0, 150)}`
          : content.slice(0, 200);
        break;
      }

      case 'docx': {
        const result = await parseServerSide(file);
        content = await aiPreprocess(result.text, file.name, 'docx');
        preview = `[DOCX: ${file.name}] ${content.slice(0, 150)}`;
        break;
      }

      case 'xlsx':
      case 'xls': {
        const result = await parseServerSide(file);
        content = await aiPreprocess(result.text, file.name, 'xlsx');
        preview = result.sheets
          ? `[Excel: ${file.name} — fogli: ${result.sheets.join(', ')}] ${content.slice(0, 100)}`
          : content.slice(0, 200);
        break;
      }

      default:
        content = await parseTextFile(file);
        preview = content.slice(0, 200);
    }
  } catch (err) {
    console.error(`[fileUpload] Errore parsing ${file.name}:`, err);
    content = `[Errore nel parsing di ${file.name}: ${err instanceof Error ? err.message : 'sconosciuto'}]`;
    preview = content;
  }

  return {
    name: file.name,
    type: file.type || `application/${ext}`,
    size: file.size,
    content,
    preview: preview || content.slice(0, 200),
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ───────────────────────────────────────────────────────

export function FileUpload({ onFilesParsed, disabled, compact }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ParsedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);

    // Validation
    const validFiles = files.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        console.warn(`[fileUpload] ${f.name} troppo grande (${formatSize(f.size)} > 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsProcessing(true);

    try {
      const parsed = await Promise.all(validFiles.map(parseFile));
      setUploadedFiles(prev => [...prev, ...parsed]);
      onFilesParsed(parsed);
    } catch (err) {
      console.error('[fileUpload] Errore elaborazione file:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesParsed]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input per poter ricaricare lo stesso file
      e.target.value = '';
    }
  }, [processFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Compact mode: just a button ──
  if (compact) {
    return (
      <>
        <button
          className="file-upload-compact-btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isProcessing}
          title="Allega file"
          aria-label="Carica file"
        >
          {isProcessing ? '⏳' : '📎'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
          className="file-upload-hidden-input"
          aria-label="Carica file"
        />
      </>
    );
  }

  return (
    <div className="file-upload-wrapper">
      {/* Drop zone */}
      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); inputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label={isProcessing ? 'Elaborazione file in corso' : 'Trascina file qui o clicca per caricare'}
        aria-busy={isProcessing}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={handleFileChange}
          className="file-upload-hidden-input"
          aria-label="Carica file"
        />

        {isProcessing ? (
          <div className="file-upload-status">
            <span className="file-upload-spinner" />
            <span>Elaborazione file...</span>
          </div>
        ) : (
          <div className="file-upload-prompt">
            <span className="file-upload-icon">📁</span>
            <span className="file-upload-text">
              Trascina file qui o <strong>clicca per caricare</strong>
            </span>
            <span className="file-upload-hint">
              PDF, DOCX, XLSX, CSV, TXT, MD, immagini · Max 10MB
            </span>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="file-upload-list">
          {uploadedFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="file-upload-item">
              <span className="file-upload-item-icon">
                {file.type.startsWith('image/') ? '🖼️' : '📄'}
              </span>
              <span className="file-upload-item-name">{file.name}</span>
              <span className="file-upload-item-size">{formatSize(file.size)}</span>
              <button
                className="file-upload-item-remove"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                title="Rimuovi"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
