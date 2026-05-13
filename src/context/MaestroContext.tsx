/**
 * BarTalk v8 — Maestro Context
 * Gestione stato per il sistema di tutoring interattivo.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  StudentProfile,
  MaestroDefinition,
  MaestroMemory,
  MaestroMessage,
  MaestroContextValue,
  StudySession,
} from '../types/maestro';
import type { CourseCategoryId } from '../types/courses';
import {
  loadStudentProfile,
  updateStudentProfile as mergeProfile,
  saveMaestroMemory,
  createDefaultMemory,
  updateMemoryFromInteraction,
  createStudySession,
  saveStudySession,
} from '../lib/studentProfile';
import {
  MAESTRI,
  getMaestroById,
  getMaestroForCategory as findMaestroForCategory,
  generateTeachingResponse,
  generateWelcomeMessage,
  getVoiceForMaestro,
  detectStudyLanguage,
  getL2Voice,
} from '../lib/maestroEngine';
import { useCourseContext } from './CourseContext';
import { useSettingsContext } from './SettingsContext';
import { enqueueTTS, stopTTS, resetTTS, getTTSState } from '../lib/tts';
import { getLangConfig, type AppLanguage } from '../types/settings';
import { generateId } from '../lib/utils';
import { processConversationMemories, consolidateMemories } from '../lib/lifeTutorMemory';
import { useXAPI } from './xAPIContext';
import { buildInteractedStatement } from '../lib/xapiBuilder';

// ── Context ─────────────────────────────────────────────────────────

const MaestroCtx = createContext<MaestroContextValue | null>(null);

export function MaestroProvider({ children }: { children: ReactNode }) {
  const { activeCourse } = useCourseContext();
  const { language, ttsEnabled } = useSettingsContext();
  const { enqueue: enqueueXAPI } = useXAPI();

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(loadStudentProfile);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [currentMaestro, setCurrentMaestro] = useState<MaestroDefinition | null>(null);
  const [memory, setMemory] = useState<MaestroMemory | null>(null);
  const [isTeaching, setIsTeaching] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Ascolta eventi TTS per resettare isSpeaking quando finisce ──
  useEffect(() => {
    const onEnd = () => {
      const { queueLength } = getTTSState();
      if (queueLength === 0) setIsSpeaking(false);
    };
    const onStop = () => setIsSpeaking(false);

    window.addEventListener('radio-audio-end', onEnd);
    window.addEventListener('radio-audio-stop', onStop);
    return () => {
      window.removeEventListener('radio-audio-end', onEnd);
      window.removeEventListener('radio-audio-stop', onStop);
    };
  }, []);

  // ── Ref per beforeunload (serve accesso non-stale alla sessione) ──
  const sessionRef = useRef(currentSession);
  sessionRef.current = currentSession;

  // ── Life Tutor: consolida + processa pending al caricamento ─────
  useEffect(() => {
    consolidateMemories();

    // Processa estrazione pendente da beforeunload precedente
    const pendingRaw = localStorage.getItem('bt_ltm_pending_extraction');
    if (pendingRaw) {
      localStorage.removeItem('bt_ltm_pending_extraction');
      try {
        const pending = JSON.parse(pendingRaw);
        processConversationMemories(
          pending.messages,
          pending.source,
          pending.courseId,
          pending.maestroId,
        ).catch(err => console.warn('[LifeTutor] Errore estrazione pending:', err));
      } catch (err) { console.warn('[maestro] Pending extraction JSON parse failed:', err); }
    }
  }, []);

  // ── beforeunload: salva memorie Life Tutor se sessione attiva ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      const session = sessionRef.current;
      if (!session || session.messages.length < 4) return;

      const msgs = session.messages.map((m: MaestroMessage) => ({
        role: m.role === 'maestro' ? 'assistant' : 'user',
        content: m.content,
      }));

      // Salviamo i messaggi in localStorage per processarli al prossimo caricamento.
      try {
        const pending = {
          messages: msgs,
          source: 'maestro_chat' as const,
          courseId: session.courseId,
          maestroId: session.maestroId,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem('bt_ltm_pending_extraction', JSON.stringify(pending));
      } catch (err) { console.warn('[maestro] beforeunload storage full:', err); }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── Profilo studente ────────────────────────────────────────────

  const saveStudentProfileAction = useCallback((updates: Partial<StudentProfile>) => {
    const merged = mergeProfile(updates);
    setStudentProfile(merged);
  }, []);

  const hasCompletedOnboarding = useCallback((): boolean => {
    return studentProfile !== null && studentProfile.name.length > 0;
  }, [studentProfile]);

  // ── Sessione di studio ──────────────────────────────────────────

  const startStudySession = useCallback((
    courseId: string,
    lessonIndex: number,
    maestroId: string,
  ) => {
    const maestro = getMaestroById(maestroId);
    if (!maestro || !studentProfile || !activeCourse) return;

    // Reset TTS prima di avviare nuova sessione
    resetTTS();

    // Ogni nuova sessione parte con memoria fresca.
    const mem = createDefaultMemory(courseId, maestroId);
    saveMaestroMemory(mem);

    setCurrentMaestro(maestro);
    setMemory(mem);

    // Crea sessione
    const session = createStudySession(courseId, lessonIndex, maestroId);

    // Genera messaggio di benvenuto
    const lesson = activeCourse.lessons[lessonIndex];
    if (lesson) {
      const welcome = generateWelcomeMessage(maestro, activeCourse, lesson, studentProfile, mem);
      session.messages = [welcome];
    }

    setCurrentSession(session);
    saveStudySession(session);

    // TTS del messaggio di benvenuto
    if (ttsEnabled && session.messages.length > 0) {
      setIsSpeaking(true);
      const voiceId = getVoiceForMaestro(maestro, language);

      // Dual-voice per corsi di lingua: fallback a L2 voice solo come voce singola
      // (enqueueDualVoiceTTS non ancora disponibile in v8.2.5 TTS module)
      const studyLang = activeCourse.category === 'lingue'
        ? detectStudyLanguage(activeCourse.topic, activeCourse.title)
        : null;

      if (studyLang) {
        // Per corsi di lingua, usa comunque la voce L1 del maestro
        // Il dual-voice sara aggiunto in un phase successiva
        const _l2VoiceId = getL2Voice(studyLang, maestro.gender === 'female' ? 'male' : 'female');
        const _l2BCP47 = getLangConfig(studyLang as AppLanguage).bcp47;
        void _l2VoiceId; void _l2BCP47; // reserved for future dual-voice support
        enqueueTTS({ text: session.messages[0].content, voiceId, agentName: maestro.name });
      } else {
        enqueueTTS({ text: session.messages[0].content, voiceId, agentName: maestro.name });
      }
    }
  }, [studentProfile, activeCourse, ttsEnabled, language]);

  // ── Invio messaggio ─────────────────────────────────────────────

  const sendMessage = useCallback(async (content: string, sessionLang?: string) => {
    if (!currentSession || !currentMaestro || !activeCourse || !studentProfile) return;

    const lesson = activeCourse.lessons[currentSession.lessonIndex];
    if (!lesson) return;

    // Usa la lingua della sessione se fornita, altrimenti la lingua globale
    const effectiveLang = sessionLang || language;

    setIsTeaching(true);

    // Messaggi [SISTEMA:] sono invisibili nella chat — vanno solo all'AI
    const isSystemFeedback = content.startsWith('[SISTEMA:');

    // Aggiungi messaggio studente (o nascondilo se e feedback di sistema)
    const studentMsg: MaestroMessage = {
      id: generateId(),
      role: isSystemFeedback ? 'system' : 'student',
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedSession: StudySession = {
      ...currentSession,
      messages: isSystemFeedback
        ? currentSession.messages  // Non aggiungere alla chat visibile
        : [...currentSession.messages, studentMsg],
      lastActivityAt: new Date().toISOString(),
    };

    setCurrentSession(updatedSession);

    try {
      // Genera risposta maestro (usa la lingua effettiva della sessione)
      const response = await generateTeachingResponse(
        currentMaestro,
        activeCourse,
        lesson,
        studentProfile,
        memory,
        updatedSession,
        content,
        effectiveLang,
      );

      // Aggiorna sessione con risposta
      const sessionWithResponse: StudySession = {
        ...updatedSession,
        messages: [...updatedSession.messages, response.message],
        coveredObjectives: response.coveredObjective >= 0
          ? [...new Set([...updatedSession.coveredObjectives, response.coveredObjective])]
          : updatedSession.coveredObjectives,
        lastActivityAt: new Date().toISOString(),
      };

      // Calcola punteggio comprensione basato su obiettivi coperti
      const totalObj = lesson.objectives.length || 1;
      sessionWithResponse.comprehensionScore = Math.round(
        (sessionWithResponse.coveredObjectives.length / totalObj) * 100
      );

      setCurrentSession(sessionWithResponse);
      saveStudySession(sessionWithResponse);

      // Aggiorna memoria
      if (memory) {
        const updatedMemory = updateMemoryFromInteraction(
          memory,
          response.detectedEmotion,
          {
            newNotes: response.teacherNote ? [response.teacherNote] : undefined,
          },
        );
        setMemory(updatedMemory);
        saveMaestroMemory(updatedMemory);
      }

      // TTS (voce in base alla lingua effettiva della sessione)
      if (ttsEnabled) {
        setIsSpeaking(true);
        const voiceId = getVoiceForMaestro(currentMaestro, effectiveLang);

        // Dual-voice per corsi di lingua: fallback to single voice
        const studyLang = activeCourse.category === 'lingue'
          ? detectStudyLanguage(activeCourse.topic, activeCourse.title)
          : null;

        if (studyLang && response.textWithL2Tags) {
          // Future: dual-voice TTS con L2 voice
          // Per ora usa voce singola L1
          enqueueTTS({ text: response.message.content, voiceId, agentName: currentMaestro.name });
        } else {
          enqueueTTS({ text: response.message.content, voiceId, agentName: currentMaestro.name });
        }
      }
    } catch (err) {
      console.error('[Maestro] Errore:', err);
      // Aggiungi messaggio di errore
      const errorMsg: MaestroMessage = {
        id: generateId(),
        role: 'system',
        content: `Ops, si e verificato un errore. Riprova tra un momento. (${err instanceof Error ? err.message : 'Errore sconosciuto'})`,
        timestamp: new Date().toISOString(),
      };
      const sessionWithError: StudySession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMsg],
      };
      setCurrentSession(sessionWithError);
      saveStudySession(sessionWithError);
    } finally {
      setIsTeaching(false);
    }
  }, [currentSession, currentMaestro, activeCourse, studentProfile, memory, language, ttsEnabled]);

  // ── Fine sessione ───────────────────────────────────────────────

  const endSession = useCallback(() => {
    if (currentSession) {
      const ended: StudySession = {
        ...currentSession,
        status: 'completed',
        lastActivityAt: new Date().toISOString(),
      };
      saveStudySession(ended);

      // xAPI: registra interazione con maestro
      if (currentMaestro && activeCourse && studentProfile && currentSession.messages.length >= 2) {
        const startTime = new Date(currentSession.startedAt).getTime();
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        enqueueXAPI(buildInteractedStatement({
          actorName: studentProfile.name || 'Studente',
          courseId: currentSession.courseId,
          courseTitle: activeCourse.title,
          lessonIndex: currentSession.lessonIndex,
          maestroId: currentSession.maestroId,
          maestroName: currentMaestro.name,
          messageCount: currentSession.messages.length,
          comprehensionScore: currentSession.comprehensionScore,
          durationSeconds: durationSec,
          studySessionId: currentSession.id,
        }));
      }

      // Life Tutor: estrai memorie dalla conversazione (fire-and-forget)
      if (currentSession.messages.length >= 4) {
        const msgs = currentSession.messages.map(m => ({
          role: m.role === 'maestro' ? 'assistant' : 'user',
          content: m.content,
        }));
        processConversationMemories(
          msgs,
          'maestro_chat',
          currentSession.courseId,
          currentSession.maestroId,
        ).catch(err => console.error('[LifeTutor] Errore estrazione memorie:', err));
      }
    }
    stopTTS();
    setCurrentSession(null);
    setCurrentMaestro(null);
    setIsTeaching(false);
    setIsSpeaking(false);
  }, [currentSession, currentMaestro, activeCourse, studentProfile, enqueueXAPI]);

  const pauseSession = useCallback(() => {
    if (currentSession) {
      const paused: StudySession = {
        ...currentSession,
        status: 'paused',
        lastActivityAt: new Date().toISOString(),
      };
      setCurrentSession(paused);
      saveStudySession(paused);
    }
    stopTTS();
    setIsSpeaking(false);
  }, [currentSession]);

  // ── Maestri ─────────────────────────────────────────────────────

  const getMaestroForCategoryAction = useCallback((category: CourseCategoryId) => {
    return findMaestroForCategory(category);
  }, []);

  const toggleVoice = useCallback(() => {
    if (isSpeaking) {
      stopTTS();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  return (
    <MaestroCtx.Provider value={{
      studentProfile,
      currentSession,
      currentMaestro,
      memory,
      isTeaching,
      isSpeaking,
      saveStudentProfile: saveStudentProfileAction,
      hasCompletedOnboarding,
      startStudySession,
      sendMessage,
      endSession,
      pauseSession,
      getMaestroForCategory: getMaestroForCategoryAction,
      availableMaestri: MAESTRI,
      toggleVoice,
    }}>
      {children}
    </MaestroCtx.Provider>
  );
}

export function useMaestroContext(): MaestroContextValue {
  const ctx = useContext(MaestroCtx);
  if (!ctx) throw new Error('useMaestroContext must be used within MaestroProvider');
  return ctx;
}
