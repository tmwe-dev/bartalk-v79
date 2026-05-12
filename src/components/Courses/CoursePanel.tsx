/**
 * BarTalk v8 — Course Panel (Coordinator)
 * Routes between 5 sub-components:
 * CourseBrowse, CourseCatalog, CourseWizard, CourseActive, CourseAssessment, CourseMaestro
 */

import { useState, useCallback } from 'react';
import { useCourseContext } from '../../context/CourseContext';
import { useMaestroContext } from '../../context/MaestroContext';
import type { CourseLevelType, CourseCategoryId, CourseLesson } from '../../types/courses';
import type { CourseTemplate, CourseFocus, CustomDirection } from '../../lib/courseCatalog';
import { buildTopicFromTemplate, buildCustomizationInstructions } from '../../lib/courseCatalog';

// Sub-components
import { CourseBrowse } from './CourseBrowse';
import { CourseCatalog } from './CourseCatalog';
import { CourseWizard } from './CourseWizard';
import { CourseActive } from './CourseActive';
import { CourseAssessment } from './CourseAssessment';
import { CourseMaestro } from './CourseMaestro';

// QUICK_SUGGESTIONS for wizard
import { QUICK_SUGGESTIONS } from '../../types/courses';
import { evaluateAnswers } from '../../lib/assessmentEngine';

type PanelView = 'browse' | 'catalog' | 'wizard' | 'active' | 'assessment' | 'maestro-select' | 'maestro-chat' | 'onboarding';

export function CoursePanel() {
  const {
    activeCourse,
    isGenerating,
    generateCourse,
    startLesson,
    completeLesson,
    setActiveCourse,
  } = useCourseContext();

  const { hasCompletedOnboarding, startStudySession } = useMaestroContext();

  // ── Primary state
  const [view, setView] = useState<PanelView>(activeCourse ? 'active' : 'browse');
  const [error, setError] = useState('');

  // ── Wizard state
  const [wizTopic, setWizTopic] = useState('');
  const [wizLevel, setWizLevel] = useState<CourseLevelType>('intermedio');
  const [wizCategory, setWizCategory] = useState<CourseCategoryId>('altro');
  const [wizStep, setWizStep] = useState(0);

  // ── Catalog state
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<CourseFocus | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<CourseLevelType>('intermedio');
  const [selectedDirection, setSelectedDirection] = useState<CustomDirection | null>(null);
  const [customText, setCustomText] = useState('');

  // ── Assessment state
  const [assessLesson, setAssessLesson] = useState<CourseLesson | null>(null);
  const [assessAnswers, setAssessAnswers] = useState<number[]>([]);
  const [assessSubmitted, setAssessSubmitted] = useState(false);
  const [assessScore, setAssessScore] = useState(0);

  // ── Maestro state
  const [maestroLessonIndex, setMaestroLessonIndex] = useState(0);

  // ── Callbacks ────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!wizTopic.trim()) return;
    setError('');
    try {
      await generateCourse(wizTopic.trim(), wizLevel, wizCategory);
      setView('active');
      setWizStep(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la generazione');
    }
  }, [wizTopic, wizLevel, wizCategory, generateCourse]);

  const handleGenerateFromTemplate = useCallback(async () => {
    if (!selectedTemplate) return;
    setError('');

    const topic = buildTopicFromTemplate(selectedTemplate, selectedFocus, selectedDirection, customText);
    const customization = buildCustomizationInstructions(selectedTemplate, selectedFocus, selectedDirection, customText);

    try {
      await generateCourse(
        topic,
        selectedLevel,
        selectedTemplate.category,
        'it',
        customization || undefined,
      );
      setView('active');
      setSelectedTemplate(null);
      setSelectedFocus(null);
      setSelectedDirection(null);
      setCustomText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la generazione');
    }
  }, [selectedTemplate, selectedFocus, selectedLevel, selectedDirection, customText, generateCourse]);

  const handleSelectTemplate = useCallback((template: CourseTemplate) => {
    setSelectedTemplate(template);
    setSelectedFocus(null);
    setSelectedLevel(template.defaultLevel);
    setSelectedDirection(null);
    setCustomText('');
    setError('');
  }, []);

  const handleOpenAssessment = useCallback((lesson: CourseLesson) => {
    if (!lesson.assessment || lesson.assessment.length === 0) return;
    setAssessLesson(lesson);
    setAssessAnswers(new Array(lesson.assessment.length).fill(-1));
    setAssessSubmitted(false);
    setAssessScore(0);
    setView('assessment');
  }, []);

  const handleSubmitAssessment = useCallback(() => {
    if (!assessLesson?.assessment) return;
    const score = evaluateAnswers(assessLesson.assessment, assessAnswers);
    setAssessScore(score);
    setAssessSubmitted(true);
    completeLesson(assessLesson.index, score);
  }, [assessLesson, assessAnswers, completeLesson]);

  const handleQuickSuggestion = useCallback((s: typeof QUICK_SUGGESTIONS[number]) => {
    setWizTopic(s.topic);
    setWizLevel(s.level);
    setWizCategory(s.category);
    setWizStep(2);
  }, []);

  const handleOpenCourse = useCallback((course: any) => {
    setActiveCourse(course.id);
    setView('active');
  }, [setActiveCourse]);

  const handleStartMaestroLesson = useCallback((lesson: CourseLesson) => {
    if (lesson.status === 'locked') return;
    startLesson(lesson.index);
    setMaestroLessonIndex(lesson.index);

    if (!hasCompletedOnboarding()) {
      setView('onboarding');
    } else {
      setView('maestro-select');
    }
  }, [startLesson, hasCompletedOnboarding]);

  const handleMaestroSelected = useCallback((maestroId: string) => {
    if (!activeCourse) return;
    startStudySession(activeCourse.id, maestroLessonIndex, maestroId);
    setView('maestro-chat');
  }, [activeCourse, maestroLessonIndex, startStudySession]);

  const handleBackToBrowse = useCallback(() => {
    setActiveCourse(null);
    setView('browse');
  }, [setActiveCourse]);

  // ── RENDER ──────────────────────────────────────────────────────────

  // Browse
  if (view === 'browse') {
    return (
      <CourseBrowse
        onOpenCourse={handleOpenCourse}
        onOpenCatalog={() => { setView('catalog'); setSelectedTemplate(null); }}
        onOpenWizard={() => { setView('wizard'); setWizStep(0); setWizTopic(''); }}
      />
    );
  }

  // Catalog
  if (view === 'catalog') {
    return (
      <CourseCatalog
        selectedTemplate={selectedTemplate}
        selectedFocus={selectedFocus}
        selectedLevel={selectedLevel}
        selectedDirection={selectedDirection}
        customText={customText}
        isGenerating={isGenerating}
        error={error}
        onSelectTemplate={handleSelectTemplate}
        onSetSelectedTemplate={setSelectedTemplate}
        onSetSelectedFocus={setSelectedFocus}
        onSetSelectedLevel={setSelectedLevel}
        onSetSelectedDirection={setSelectedDirection}
        onSetCustomText={setCustomText}
        onGenerateFromTemplate={handleGenerateFromTemplate}
        onBack={() => setView('browse')}
      />
    );
  }

  // Wizard
  if (view === 'wizard') {
    return (
      <CourseWizard
        topic={wizTopic}
        level={wizLevel}
        category={wizCategory}
        step={wizStep}
        isGenerating={isGenerating}
        error={error}
        onSetTopic={setWizTopic}
        onSetLevel={setWizLevel}
        onSetCategory={setWizCategory}
        onSetStep={setWizStep}
        onGenerate={handleGenerate}
        onQuickSuggestion={handleQuickSuggestion}
        onBack={() => setView('browse')}
      />
    );
  }

  // Assessment
  if (view === 'assessment' && assessLesson?.assessment) {
    return (
      <CourseAssessment
        lesson={assessLesson}
        answers={assessAnswers}
        submitted={assessSubmitted}
        score={assessScore}
        onSetAnswers={setAssessAnswers}
        onSubmit={handleSubmitAssessment}
        onRetry={() => {
          setAssessAnswers(new Array(assessLesson.assessment!.length).fill(-1));
          setAssessSubmitted(false);
        }}
        onBack={() => setView('active')}
      />
    );
  }

  // Active
  if (view === 'active' && activeCourse) {
    return (
      <CourseActive
        activeCourse={activeCourse}
        onOpenAssessment={handleOpenAssessment}
        onStartMaestroLesson={handleStartMaestroLesson}
        onBack={handleBackToBrowse}
      />
    );
  }

  // Maestro (select, chat, onboarding)
  if (['maestro-select', 'maestro-chat', 'onboarding'].includes(view)) {
    return (
      <CourseMaestro
        activeCourse={activeCourse}
        maestroLessonIndex={maestroLessonIndex}
        view={view as 'maestro-select' | 'maestro-chat' | 'onboarding'}
        onMaestroSelected={handleMaestroSelected}
        onOnboardingComplete={() => setView('maestro-select')}
        onBack={() => setView('active')}
      />
    );
  }

  // Fallback
  return (
    <div className="course-panel">
      <div className="course-empty">
        <div className="course-empty-icon">🎓</div>
        <p>Nessun percorso attivo</p>
        <button className="course-btn-primary" onClick={() => setView('browse')}>
          Vai ai Percorsi
        </button>
      </div>
    </div>
  );
}
