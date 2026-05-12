import { useCallback } from 'react';
import { useCourseContext } from '../../context/CourseContext';
import type { CourseDefinition } from '../../types/courses';
import { COURSE_LEVEL_META } from '../../types/courses';

interface CourseBrowseProps {
  onOpenCourse: (course: CourseDefinition) => void;
  onOpenCatalog: () => void;
  onOpenWizard: () => void;
}

export function CourseBrowse({ onOpenCourse, onOpenCatalog, onOpenWizard }: CourseBrowseProps) {
  const { courses, generationWarning, deleteCourse } = useCourseContext();

  const handleDelete = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCourse(courseId);
  }, [deleteCourse]);

  return (
    <div className="course-panel">
      <div className="course-panel-header">
        <h2 className="course-panel-title">📚 Percorsi Formativi</h2>
      </div>

      {/* Action buttons */}
      <div className="course-browse-actions">
        <button className="course-btn-catalog" onClick={onOpenCatalog}>
          <span className="course-btn-catalog-icon">📖</span>
          <span className="course-btn-catalog-text">
            <strong>Catalogo Corsi</strong>
            <small>Scegli da percorsi pronti e personalizzabili</small>
          </span>
        </button>
        <button className="course-btn-custom" onClick={onOpenWizard}>
          <span className="course-btn-catalog-icon">✏️</span>
          <span className="course-btn-catalog-text">
            <strong>Corso Personalizzato</strong>
            <small>Crea da zero su qualsiasi argomento</small>
          </span>
        </button>
      </div>

      {/* Generation warning */}
      {generationWarning && (
        <div className="course-warning-banner">
          {generationWarning}
        </div>
      )}

      {/* Course list */}
      {courses.length > 0 && (
        <>
          <div className="course-section-divider">I tuoi percorsi</div>
          <div className="course-list">
            {courses.map(course => {
              const prog = (() => {
                try {
                  const raw = localStorage.getItem(`bt_course_progress_${course.id}`);
                  return raw ? JSON.parse(raw) : null;
                } catch { return null; }
              })();
              const pct = prog ? Math.round((prog.completedLessons / course.totalLessons) * 100) : 0;

              return (
                <div key={course.id} className="course-list-item" onClick={() => onOpenCourse(course)}>
                  <div className="course-list-item-header">
                    <span className="course-list-item-title">{course.title}</span>
                    <button
                      className="course-list-item-delete"
                      onClick={(e) => handleDelete(course.id, e)}
                      title="Elimina percorso"
                    >🗑</button>
                  </div>
                  <div className="course-list-item-meta">
                    <span className="course-level-badge">{COURSE_LEVEL_META[course.level].icon} {COURSE_LEVEL_META[course.level].label}</span>
                    <span>{course.totalLessons} lezioni</span>
                  </div>
                  <div className="course-progress-bar">
                    <div className="course-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="course-progress-label">{pct}% completato</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="course-empty">
          <div className="course-empty-icon">🎓</div>
          <p>Nessun percorso creato</p>
          <p className="course-empty-hint">Scegli dal catalogo o crea un percorso personalizzato</p>
        </div>
      )}
    </div>
  );
}
