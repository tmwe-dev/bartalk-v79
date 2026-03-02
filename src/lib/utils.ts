/** Genera un ID univoco */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Timestamp ISO corrente */
export function now(): string {
  return new Date().toISOString();
}

/** Tronca il testo a maxLen caratteri */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/** Rimuovi tag HTML da una stringa */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** Formatta durata in ms → "1.2s" */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Formatta timestamp → "14:30" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/** Attendi n millisecondi */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Classnames helper minimale */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
