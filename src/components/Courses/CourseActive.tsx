import type { CourseDefinition, CourseLesson } from '../../types/courses';
import { COURSE_LEVEL_META } from '../../types/courses';
import { getScoreInfo } from '../../lib/assessmentEngine';

interface CourseActiveProps {
  activeCourse: CourseDefinition;
  onOpenAssessment: (lesson: CourseLesson) => void;
  onStartMaestroLesson: (lesson: CourseLesson) => void;
  onBack: () => void;
}

export function CourseActive({
  activeCourse,
  onOpenAssessment,
  onStartMaestroLesson,
  onBack,
}: CourseActiveProps) {
  const completedCount = activeCourse.lessons.filter(l => l.status === 'completed').length;
  const pct = Math.round((completedCount / activeCourse.totalLessons) * 100);

  return (
    <div className="course-panel">
      <div className="course-panel-header">
        <button className="course-btn-back" onClick={onBack}>← Percorsi</button>
        <h2 className="course-panel-title">{activeCourse.title}</h2>
      </div>

      {/* Progress header */}
      <div className="course-active-header">
        <span className="course-level-badge">
          {COURSE_LEVEL_META[activeCourse.level].icon} {COURSE_LEVEL_META[activeCourse.level].label}
        </span>
        <span className="course-active-progress-text">{completedCount}/{activeCourse.totalLessons} lezioni — {pct}%</span>
      </div>
      <div className="course-progress-bar large">
        <div className="course-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Certified sources notice */}
      {activeCourse.requiresCertifiedSources && (
        <div className="course-certified-banner">
          ⚠️ Percorso con fonti certificate — Le fonti accademiche sono evidenziate in ogni lezione
        </div>
      )}

      {/* Lesson list */}
      <div className="course-lesson-list">
        {activeCourse.lessons.map(lesson => {
          const statusIcon = {
            locked: '🔒',
            available: '⭕',
            in_progress: '🔄',
            completed: '✅',
          }[lesson.status];

          const scoreInfo = lesson.score !== undefined ? getScoreInfo(lesson.score) : null;

          return (
            <div key={lesson.id} className={`course-lesson-item ${lesson.status}`}>
              <div className="course-lesson-status">{statusIcon}</div>
              <div className="course-lesson-content">
                <div className="course-lesson-header">
                  <span className="course-lesson-index">Lezione {lesson.index + 1}</span>
                  <span className="course-lesson-title">{lesson.title}</span>
                  {scoreInfo && (
                    <span className="course-lesson-score" style={{ color: scoreInfo.color }}>
                      {scoreInfo.icon} {lesson.score}%
                    </span>
                  )}
                </div>
                <p className="course-lesson-desc">{lesson.description}</p>

                {/* Sources */}
                {lesson.sources && lesson.sources.length > 0 && (
                  <div className="course-lesson-sources">
                    {lesson.sources.map((s, si) => (
                      <span key={si} className="course-source-tag" title={`Credibilità: ${s.credibility}/5`}>
                        📖 {s.title}
                        {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer"> ↗</a>}
                        <span className="course-source-cred">{'★'.repeat(s.credibility)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="course-lesson-actions">
                  {lesson.status === 'available' && (
                    <button className="course-btn-primary small" onClick={() => onStartMaestroLesson(lesson)}>
                      👩‍🏫 Studia con il Maestro
                    </button>
                  )}
                  {(lesson.status === 'in_progress' || lesson.status === 'completed') && (
                    <>
                      <button className="course-btn-primary small" onClick={() => onStartMaestroLesson(lesson)}>
                        👩‍🏫 {lesson.status === 'completed' ? 'Ripassa con il Maestro' : 'Continua con il Maestro'}
                      </button>
                      {lesson.assessment && lesson.assessment.length > 0 && (
                        <button className="course-btn-secondary small" onClick={() => onOpenAssessment(lesson)}>
                          📝 {lesson.status === 'completed' ? 'Rivedi Quiz' : 'Fai Quiz'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
