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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    save(task);
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
        const updated = { ...prev, currentPhase: nextPhase, updatedAt: new Date().toISOString() };
        localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
        return updated;
      }
      // Ultima fase → completato
      const updated = { ...prev, currentPhase: 'completed' as TaskPhase, isActive: false, updatedAt: new Date().toISOString() };
      localStorage.setItem('bartalk_active_task', JSON.stringify(updated));
      return updated;
    });
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

  const getTaskPromptContext = useCallback((): string => {
    if (!activeTask || !activeTask.isActive) return '';

    const template = DELIVERABLE_TEMPLATES[activeTask.type];
    const phaseInstruction = template.phaseInstructions[activeTask.currentPhase] || '';

    const parts: string[] = [];
    parts.push(`\n---\n🎯 OBIETTIVO ATTIVO: ${activeTask.title}`);
    parts.push(`Tipo: ${template.label} (${template.icon})`);
    parts.push(`Descrizione: ${activeTask.description}`);
    parts.push(`Fase corrente: ${activeTask.currentPhase.toUpperCase()}`);
    parts.push(`Istruzione fase: ${phaseInstruction}`);

    if (activeTask.attachedFiles.length > 0) {
      parts.push('\nFILE ALLEGATI:');
      for (const f of activeTask.attachedFiles) {
        const preview = f.content.length > 800 ? f.content.substring(0, 800) + '...' : f.content;
        parts.push(`--- ${f.name} (${f.type}) ---\n${preview}`);
      }
    }

    if (activeTask.leadAgent) {
      parts.push(`\nAGENTE REDATTORE: Questo agente è il redattore principale del deliverable.`);
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
