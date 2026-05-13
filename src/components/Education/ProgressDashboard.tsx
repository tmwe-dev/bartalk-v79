/**
 * BarTalk v8.2.5 — Dashboard Progressi Educativi
 * Visualizza statistiche aggregate: corsi, punteggi, tempo, obiettivi.
 * Accessibile da Settings o come tab nella UI principale.
 */

import { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useCourseContext } from '../../context/CourseContext';
import type { CourseDefinition, CourseProgress } from '../../types/courses';
import { COURSE_CATEGORIES, COURSE_LEVEL_META } from '../../types/courses';

// ── localStorage helpers (mirror CourseContext pattern) ──────────────

function loadAllProgress(courses: CourseDefinition[]): Map<string, CourseProgress> {
  const map = new Map<string, CourseProgress>();
  for (const c of courses) {
    try {
      const raw = localStorage.getItem(`bt_course_progress_${c.id}`);
      if (raw) map.set(c.id, JSON.parse(raw));
    } catch { /* skip */ }
  }
  return map;
}

function loadStudySessions(): { courseId: string; duration: number; date: string }[] {
  try {
    const raw = localStorage.getItem('bt_study_sessions');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Componente principale ───────────────────────────────────────────

export function ProgressDashboard() {
  const { courses } = useCourseContext();
  const [progressMap, setProgressMap] = useState<Map<string, CourseProgress>>(new Map());
  const [sessions, setSessions] = useState<{ courseId: string; duration: number; date: string }[]>([]);

  useEffect(() => {
    setProgressMap(loadAllProgress(courses));
    setSessions(loadStudySessions());
  }, [courses]);

  // ── Statistiche aggregate ──────────────────────────────────────────

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const completedCourses = courses.filter(c => {
      const p = progressMap.get(c.id);
      return p && p.completedLessons >= c.totalLessons;
    }).length;
    const inProgressCourses = courses.filter(c => {
      const p = progressMap.get(c.id);
      return p && p.completedLessons > 0 && p.completedLessons < c.totalLessons;
    }).length;

    let totalLessonsCompleted = 0;
    let totalLessons = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const c of courses) {
      totalLessons += c.totalLessons;
      const p = progressMap.get(c.id);
      if (p) {
        totalLessonsCompleted += p.completedLessons;
        if (p.averageScore > 0) {
          scoreSum += p.averageScore;
          scoreCount++;
        }
      }
    }

    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

    // Obiettivi padroneggiati (dai corsi con lezioni completate)
    let masteredObjectives = 0;
    for (const c of courses) {
      for (const l of c.lessons) {
        if (l.status === 'completed' && l.objectives) {
          masteredObjectives += l.objectives.length;
        }
      }
    }

    // Tempo totale (sessioni)
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    // Categorie
    const categoryCounts: Record<string, number> = {};
    for (const c of courses) {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    }

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      totalLessons,
      totalLessonsCompleted,
      avgScore,
      masteredObjectives,
      totalMinutes,
      categoryCounts,
    };
  }, [courses, progressMap, sessions]);

  // ── Corsi recenti ──────────────────────────────────────────────────

  const recentCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [courses]);

  // ── Render ─────────────────────────────────────────────────────────

  if (courses.length === 0) {
    return (
      <ErrorBoundary>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📊</div>
          <h3 style={styles.emptyTitle}>Nessun dato ancora</h3>
          <p style={styles.emptyText}>
            Crea il tuo primo corso per iniziare a tracciare i progressi di apprendimento.
          </p>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>⚠️</div>
          <h3 style={styles.emptyTitle}>Errore nel caricamento</h3>
          <p style={styles.emptyText}>
            Impossibile visualizzare i progressi. Prova a ricaricare la pagina.
          </p>
        </div>
      }
    >
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Progressi di Apprendimento</h2>

      {/* ── Stat Cards ── */}
      <div style={styles.statsGrid}>
        <StatCard icon="📚" label="Corsi" value={stats.totalCourses} sub={`${stats.completedCourses} completati`} color="#4f46e5" />
        <StatCard icon="✅" label="Lezioni" value={stats.totalLessonsCompleted} sub={`di ${stats.totalLessons} totali`} color="#059669" />
        <StatCard icon="🎯" label="Punteggio medio" value={`${stats.avgScore}%`} sub={stats.avgScore >= 80 ? 'Ottimo!' : stats.avgScore >= 60 ? 'Buono' : 'Da migliorare'} color="#d97706" />
        <StatCard icon="🧠" label="Obiettivi" value={stats.masteredObjectives} sub="padroneggiati" color="#7c3aed" />
        {stats.totalMinutes > 0 && (
          <StatCard icon="⏱️" label="Tempo" value={formatTime(stats.totalMinutes)} sub="di studio" color="#0891b2" />
        )}
        <StatCard icon="📈" label="In corso" value={stats.inProgressCourses} sub="corsi attivi" color="#e11d48" />
      </div>

      {/* ── Barra progresso globale ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Completamento globale</h3>
        <ProgressBar
          value={stats.totalLessonsCompleted}
          max={stats.totalLessons}
          label={`${stats.totalLessonsCompleted}/${stats.totalLessons} lezioni`}
        />
      </div>

      {/* ── Categorie ── */}
      {Object.keys(stats.categoryCounts).length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Per categoria</h3>
          <div style={styles.categoryGrid}>
            {Object.entries(stats.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([catId, count]) => {
                const cat = COURSE_CATEGORIES.find(c => c.id === catId);
                return (
                  <div key={catId} style={styles.categoryChip}>
                    <span>{cat?.icon || '📁'}</span>
                    <span style={styles.categoryLabel}>{cat?.label || catId}</span>
                    <span style={styles.categoryCount}>{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Corsi recenti ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Corsi recenti</h3>
        <div style={styles.courseList}>
          {recentCourses.map(course => {
            const p = progressMap.get(course.id);
            const pct = course.totalLessons > 0
              ? Math.round(((p?.completedLessons || 0) / course.totalLessons) * 100)
              : 0;
            const levelMeta = COURSE_LEVEL_META[course.level];

            return (
              <div key={course.id} style={styles.courseCard}>
                <div style={styles.courseHeader}>
                  <span style={styles.courseIcon}>
                    {COURSE_CATEGORIES.find(c => c.id === course.category)?.icon || '📚'}
                  </span>
                  <div style={styles.courseInfo}>
                    <div style={styles.courseTitle}>{course.title}</div>
                    <div style={styles.courseMeta}>
                      {levelMeta?.icon} {levelMeta?.label} · {course.totalLessons} lezioni
                    </div>
                  </div>
                  <div style={styles.coursePct}>{pct}%</div>
                </div>
                <ProgressBar
                  value={p?.completedLessons || 0}
                  max={course.totalLessons}
                  label={`${p?.completedLessons || 0}/${course.totalLessons}`}
                  height={6}
                />
                {p?.averageScore ? (
                  <div style={styles.courseScore}>
                    Media: {Math.round(p.averageScore)}%
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}

// ── Sub-componenti ───────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

function ProgressBar({ value, max, label, height = 8 }: {
  value: number; max: number; label: string; height?: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={styles.progressContainer}>
      <div style={{ ...styles.progressTrack, height }}>
        <div style={{
          ...styles.progressFill,
          width: `${pct}%`,
          height,
          background: pct >= 80 ? '#059669' : pct >= 40 ? '#d97706' : '#6366f1',
        }} />
      </div>
      <span style={styles.progressLabel}>{label}</span>
    </div>
  );
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Stili inline ─────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 20,
    color: 'var(--text-primary, #1a1a2e)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: 12,
    padding: '16px 12px',
    textAlign: 'center' as const,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--text-primary, #1a1a2e)',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary, #666)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  statSub: {
    fontSize: 11,
    color: 'var(--text-tertiary, #999)',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: 'var(--text-primary, #1a1a2e)',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    background: 'var(--bg-tertiary, #e5e7eb)',
    borderRadius: 99,
    overflow: 'hidden' as const,
  },
  progressFill: {
    borderRadius: 99,
    transition: 'width 0.4s ease',
  },
  progressLabel: {
    fontSize: 13,
    color: 'var(--text-secondary, #666)',
    whiteSpace: 'nowrap' as const,
    minWidth: 60,
    textAlign: 'right' as const,
  },
  categoryGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  categoryChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--bg-secondary, #f0f1f3)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
  },
  categoryLabel: {
    fontWeight: 500,
  },
  categoryCount: {
    background: 'var(--bg-tertiary, #d1d5db)',
    borderRadius: 99,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 700,
  },
  courseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  courseCard: {
    background: 'var(--bg-secondary, #f8f9fa)',
    borderRadius: 12,
    padding: 14,
  },
  courseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  courseIcon: {
    fontSize: 22,
  },
  courseInfo: {
    flex: 1,
    minWidth: 0,
  },
  courseTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-primary, #1a1a2e)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  courseMeta: {
    fontSize: 12,
    color: 'var(--text-secondary, #888)',
  },
  coursePct: {
    fontWeight: 700,
    fontSize: 16,
    color: 'var(--text-primary, #1a1a2e)',
  },
  courseScore: {
    fontSize: 12,
    color: 'var(--text-secondary, #888)',
    marginTop: 6,
    textAlign: 'right' as const,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary, #1a1a2e)',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--text-secondary, #888)',
    maxWidth: 320,
    margin: '0 auto',
  },
};
