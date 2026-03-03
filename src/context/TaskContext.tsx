/**
 * BarTalk v8 — Task Context
 * Gestione stato per il sistema Task/Obiettivi.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  TaskObjective,
  TaskPhase,
  DeliverableType,
  AttachedFile,
  TaskContextValue,
  PhaseMaturityResult,
} from '../types/tasks';
import { DELIVERABLE_TEMPLATES } from '../lib/taskTemplates';
import { generateId } from '../lib/utils';

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [activeTask, setActiveTask] = useState<TaskObjective | null>(() => {
    try {
      const saved = localStorage.getItem('bartalk_active_task');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const save = (task: TaskObjective | null) => {
    setActiveTask(task);
    if (task) {
      localStorage.setItem('bartalk_active_task', JSON.stringify(task));
    } else {
      localStorage.removeItem('bartalk_active_task');
    }
  };

  const [phaseSuggestionDismissed, setPhaseSuggestionDismissed] = useState(false);

  const createTask = useCallback((type: DeliverableType, title: string, description: string) => {
    const template = DELIVERABLE_TEMPLATES[type];
    const task: TaskObjective = {
      id: generateId(),
      conversationId: '',
      type,
      title,
      description,
      currentPhase: 'setup',
      phases: template.phases,
      attachedFiles: [],
      deliverableContent: '',
      phaseStartMessageIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    save(task);
    setPhaseSuggestionDismissed(false);
  }, []);

  const updatePhase = useCallback((phase: TaskPhase) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = { ...prev, currentPhase: phase, updatedAt: new Date().toISOString() };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const advancePhase = useCallback(() => {
    setActiveTask(prev => {
      if (!prev) return null;
      const currentIdx = prev.phases.indexOf(prev.currentPhase);
      if (currentIdx < prev.phases.length - 1) {
        const nextPhase = prev.phases[currentIdx + 1];
        const updated = { ...prev, currentPhase: nextPhase, phaseStartMessageIndex: Date.now(), updatedAt: new Date().toISOString() };
        localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
        return updated;
      }
      const updated = { ...prev, currentPhase: 'completed' as TaskPhase, isActive: false, updatedAt: new Date().toISOString() };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
    setPhaseSuggestionDismissed(false);
  }, []);

  const attachFile = useCallback((file: AttachedFile) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        attachedFiles: [...prev.attachedFiles, file],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        attachedFiles: prev.attachedFiles.filter(f => f.id !== fileId),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setLeadAgent = useCallback((agentId: string) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = { ...prev, leadAgent: agentId, updatedAt: new Date().toISOString() };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setDeliverableContent = useCallback((content: string) => {
    setActiveTask(prev => {
      if (!prev) return null;
      const updated = { ...prev, deliverableContent: content, updatedAt: new Date().toISOString() };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearTask = useCallback(() => {
    save(null);
  }, []);

  // ── Phase maturity check ───────────────────────────────────────────
  const PHASE_MIN_MESSAGES: Record<string, number> = {
    setup: 2,
    analysis: 6,
    debate: 8,
    synthesis: 4,
    deliverable: 2,
  };

  const checkPhaseMaturity = useCallback((totalMessages: number, convergence: string): PhaseMaturityResult => {
    if (!activeTask || !activeTask.isActive || activeTask.currentPhase === 'completed') {
      return { ready: false, reason: '', messagesSincePhaseStart: 0 };
    }

    const phase = activeTask.currentPhase;
    const msgSince = Math.max(0, totalMessages - (activeTask.phaseStartMessageIndex || 0));
    const minRequired = PHASE_MIN_MESSAGES[phase] || 4;

    if (msgSince < minRequired) {
      return { ready: false, reason: `Servono almeno ${minRequired - msgSince} messaggi in più`, messagesSincePhaseStart: msgSince };
    }

    // Regole per fase
    if (phase === 'analysis' && msgSince >= minRequired) {
      return { ready: true, reason: 'Analisi sufficiente. Puoi passare al dibattito.', messagesSincePhaseStart: msgSince };
    }
    if (phase === 'debate') {
      if (convergence === 'agreement' && msgSince >= minRequired) {
        return { ready: true, reason: 'Gli agenti convergono. Puoi passare alla sintesi.', messagesSincePhaseStart: msgSince };
      }
      if (msgSince >= minRequired * 2) {
        return { ready: true, reason: 'Dibattito esteso. Considera di passare alla sintesi.', messagesSincePhaseStart: msgSince };
      }
    }
    if (phase === 'synthesis' && msgSince >= minRequired) {
      if (convergence === 'agreement') {
        return { ready: true, reason: 'Sintesi completata. Puoi procedere al deliverable.', messagesSincePhaseStart: msgSince };
      }
      if (msgSince >= minRequired * 2) {
        return { ready: true, reason: 'Sintesi estesa. Considera di procedere al deliverable.', messagesSincePhaseStart: msgSince };
      }
    }
    if (phase === 'setup' && msgSince >= minRequired) {
      return { ready: true, reason: 'Setup completo. Avvia l\'analisi.', messagesSincePhaseStart: msgSince };
    }

    return { ready: false, reason: '', messagesSincePhaseStart: msgSince };
  }, [activeTask]);

  const dismissPhaseSuggestion = useCallback(() => {
    setPhaseSuggestionDismissed(true);
  }, []);

  // getTaskPromptContext ora accetta agentId per differenziare il comportamento
  const getTaskPromptContext = useCallback((agentId?: string): string => {
    if (!activeTask || !activeTask.isActive) return '';

    const template = DELIVERABLE_TEMPLATES[activeTask.type];
    const phaseInstruction = template.phaseInstructions[activeTask.currentPhase] || '';
    const isLeadAgent = agentId && activeTask.leadAgent === agentId;
    const phase = activeTask.currentPhase;

    const parts: string[] = [];
    parts.push(`\n---\n🎯 OBIETTIVO ATTIVO: ${activeTask.title}`);
    parts.push(`Tipo: ${template.label} (${template.icon})`);
    parts.push(`Descrizione: ${activeTask.description}`);
    parts.push(`Fase corrente: ${phase.toUpperCase()}`);
    parts.push(`Istruzione fase: ${phaseInstruction}`);

    // ── Istruzioni specifiche per fase e ruolo ───────────────────
    if (phase === 'analysis') {
      parts.push('\nCOMPORTAMENTO FASE ANALISI:');
      parts.push('- Analizza in profondità il tema/dati forniti');
      parts.push('- Identifica pattern, fatti chiave, criticità');
      parts.push('- Non trarre conclusioni definitive, apri discussione');
    } else if (phase === 'debate') {
      parts.push('\nCOMPORTAMENTO FASE DIBATTITO:');
      parts.push('- Esprimi una posizione chiara e distinta dagli altri agenti');
      parts.push('- Argomenta con evidenze');
      parts.push('- Sfida le posizioni degli altri quando hai argomentazioni migliori');
      parts.push('- Cerca punti di forza e debolezza in ogni proposta');
    } else if (phase === 'synthesis') {
      parts.push('\nCOMPORTAMENTO FASE SINTESI:');
      parts.push('- Cerca convergenza e punti di accordo');
      parts.push('- Proponi una sintesi che integri le migliori idee emerse');
      parts.push('- Identifica le conclusioni condivise e le questioni aperte');
    } else if (phase === 'deliverable') {
      if (isLeadAgent) {
        parts.push('\n🖊️ SEI IL REDATTORE PRINCIPALE DEL DELIVERABLE.');
        parts.push('Devi produrre il deliverable finale completo basandoti su:');
        parts.push('- Tutte le analisi e discussioni precedenti');
        parts.push('- I punti di accordo raggiunti in fase di sintesi');
        parts.push('- I file allegati forniti');
        parts.push(`Il formato richiesto è: ${template.outputFormat}`);
        parts.push('Produci un output COMPLETO, strutturato e professionale.');
      } else {
        parts.push('\nCOMPORTAMENTO FASE DELIVERABLE:');
        parts.push('- Supporta il redattore con integrazioni, correzioni e suggerimenti');
        parts.push('- Verifica la completezza e accuratezza del deliverable');
        parts.push('- Proponi miglioramenti specifici se necessario');
      }
    }

    if (activeTask.attachedFiles.length > 0) {
      parts.push('\n📚 KNOWLEDGE BASE — FILE ALLEGATI:');
      parts.push('Usa questi documenti come riferimento primario per le tue risposte.');

      // Budget token per file: distribuisci equamente max ~4000 char totali
      const totalBudget = 4000;
      const perFileBudget = Math.floor(totalBudget / activeTask.attachedFiles.length);

      for (const f of activeTask.attachedFiles) {
        const content = f.content.length > perFileBudget
          ? f.content.substring(0, perFileBudget) + `\n...[troncato: file ${(f.size / 1024).toFixed(1)}KB, mostrati primi ${perFileBudget} caratteri]`
          : f.content;
        parts.push(`\n--- 📄 ${f.name} (${(f.size / 1024).toFixed(1)}KB) ---\n${content}`);
      }
      parts.push('--- FINE KNOWLEDGE BASE ---');
    }

    parts.push(`\nIMPORTANTE: Ogni tua risposta deve contribuire all'obiettivo "${activeTask.title}". Segui le istruzioni della fase corrente.`);

    return parts.join('\n');
  }, [activeTask]);

  return (
    <TaskContext.Provider value={{
      activeTask,
      createTask,
      updatePhase,
      advancePhase,
      attachFile,
      removeFile,
      setLeadAgent,
      setDeliverableContent,
      clearTask,
      getTaskPromptContext,
      checkPhaseMaturity,
      phaseSuggestionDismissed,
      dismissPhaseSuggestion,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
