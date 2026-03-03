/**
 * BarTalk v8 — Sistema Task / Obiettivi
 * Permette di definire un obiettivo finale per una conversazione
 * e guidare gli agenti verso la produzione di un deliverable.
 */

export type TaskPhase = 'setup' | 'analysis' | 'debate' | 'synthesis' | 'deliverable' | 'completed';

export type DeliverableType =
  | 'report'          // Report strutturato (Markdown)
  | 'analysis'        // Analisi dati / documento analitico
  | 'plan'            // Piano strategico / marketing / business
  | 'lesson'          // Lezione didattica
  | 'creative'        // Testo creativo / storytelling
  | 'code'            // Codice / script
  | 'brainstorm'      // Brainstorming strutturato
  | 'review'          // Revisione / feedback su documento
  | 'custom';         // Obiettivo personalizzato

export interface DeliverableTemplate {
  type: DeliverableType;
  icon: string;
  label: string;
  description: string;
  phases: TaskPhase[];
  phaseInstructions: Record<TaskPhase, string>;
  outputFormat: 'markdown' | 'html' | 'text';
  suggestedMode: 'consultation' | 'standard';
}

export interface AttachedFile {
  id: string;
  name: string;
  content: string;       // Contenuto testo del file
  type: string;          // MIME type
  size: number;          // bytes
  addedAt: string;       // ISO timestamp
}

export interface TaskObjective {
  id: string;
  conversationId: string;
  type: DeliverableType;
  title: string;
  description: string;
  currentPhase: TaskPhase;
  phases: TaskPhase[];
  attachedFiles: AttachedFile[];
  deliverableContent: string;    // Il deliverable finale prodotto
  leadAgent?: string;            // Agente "redattore" del deliverable
  phaseStartMessageIndex: number; // Indice messaggio inizio fase corrente
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface PhaseMaturityResult {
  ready: boolean;
  reason: string;
  messagesSincePhaseStart: number;
}

export interface TaskContextValue {
  activeTask: TaskObjective | null;
  createTask: (type: DeliverableType, title: string, description: string) => void;
  updatePhase: (phase: TaskPhase) => void;
  advancePhase: () => void;
  attachFile: (file: AttachedFile) => void;
  removeFile: (fileId: string) => void;
  setLeadAgent: (agentId: string) => void;
  setDeliverableContent: (content: string) => void;
  clearTask: () => void;
  getTaskPromptContext: (agentId?: string) => string;
  /** Controlla se la fase corrente è matura per avanzare */
  checkPhaseMaturity: (totalMessages: number, convergence: string) => PhaseMaturityResult;
  /** Suggerimento avanzamento: true se l'utente ha già visto il suggerimento */
  phaseSuggestionDismissed: boolean;
  dismissPhaseSuggestion: () => void;
}
