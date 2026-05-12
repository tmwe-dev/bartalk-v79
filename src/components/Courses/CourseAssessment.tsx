import type { CourseLesson } from '../../types/courses';
import {
  getScoreInfo,
  shouldUnlockNext,
  getFeedbackMessage,
} from '../../lib/assessmentEngine';

interface CourseAssessmentProps {
  lesson: CourseLesson;
  answers: number[];
  submitted: boolean;
  score: number;

  onSetAnswers: (answers: number[]) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export function CourseAssessment({
  lesson,
  answers,
  submitted,
  score,
  onSetAnswers,
  onSubmit,
  onRetry,
  onBack,
}: CourseAssessmentProps) {
  if (!lesson.assessment || lesson.assessment.length === 0) {
    return null;
  }

  const questions = lesson.assessment;

  // Results view
  if (submitted) {
    const scoreInfo = getScoreInfo(score);
    const feedback = getFeedbackMessage(score, lesson.title);
    const passed = shouldUnlockNext(score);

    return (
      <div className="course-panel">
        <div className="course-panel-header">
          <h2 className="course-panel-title">📝 Risultato Assessment</h2>
        </div>

        <div className="course-assessment-result">
          <div className="course-assessment-score" style={{ color: scoreInfo.color }}>
            <span className="course-assessment-score-icon">{scoreInfo.icon}</span>
            <span className="course-assessment-score-number">{score}%</span>
            <span className="course-assessment-score-label">{scoreInfo.label}</span>
          </div>

          <p className="course-assessment-feedback">{feedback}</p>

          <div className="course-assessment-details">
            {questions.map((q, i) => {
              const isCorrect = answers[i] === q.correctIndex;
              return (
                <div key={q.id} className={`course-assessment-detail ${isCorrect ? 'correct' : 'wrong'}`}>
                  <div className="course-assessment-detail-header">
                    <span>{isCorrect ? '✅' : '❌'}</span>
                    <span className="course-assessment-detail-q">{q.question}</span>
                  </div>
                  {!isCorrect && (
                    <div className="course-assessment-detail-answer">
                      Risposta corretta: <strong>{q.options[q.correctIndex]}</strong>
                    </div>
                  )}
                  <div className="course-assessment-detail-explanation">{q.explanation}</div>
                  {q.sources && q.sources.length > 0 && (
                    <div className="course-assessment-detail-sources">
                      {q.sources.map((s, si) => (
                        <span key={si} className="course-source-tag">
                          📖 {s.title}
                          {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer"> ↗</a>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="course-wizard-buttons">
            <button className="course-btn-primary" onClick={onBack}>
              ✅ Prosegui al percorso
            </button>
            {!passed && (
              <button className="course-btn-secondary" onClick={onRetry}>
                🔄 Ritenta per migliorare
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="course-panel">
      <div className="course-panel-header">
        <button className="course-btn-back" onClick={onBack}>← Indietro</button>
        <h2 className="course-panel-title">📝 Assessment: {lesson.title}</h2>
      </div>

      <div className="course-assessment">
        {questions.map((q, qi) => (
          <div key={q.id} className="course-assessment-question">
            <div className="course-assessment-q-number">{qi + 1}/{questions.length}</div>
            <div className="course-assessment-q-text">{q.question}</div>
            <div className="course-assessment-options">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  className={`course-assessment-option ${answers[qi] === oi ? 'selected' : ''}`}
                  onClick={() => {
                    const newAnswers = [...answers];
                    newAnswers[qi] = oi;
                    onSetAnswers(newAnswers);
                  }}
                >
                  <span className="course-assessment-option-letter">{'ABCD'[oi]}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          className="course-btn-primary"
          disabled={answers.includes(-1)}
          onClick={onSubmit}
        >
          Verifica Risposte
        </button>
      </div>
    </div>
  );
}
