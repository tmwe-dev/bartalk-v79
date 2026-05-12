/**
 * BarTalk v8 — Assessment Engine
 * Sistema leggero di valutazione per lezioni dei percorsi.
 */

import type { AssessmentQuestion } from '../types/courses';

// ── Soglie ──────────────────────────────────────────────────────────

export const PASS_THRESHOLD = 50;   // Score minimo per sbloccare lezione successiva

export const SCORE_LABELS: { min: number; label: string; icon: string; color: string }[] = [
  { min: 90, label: 'Eccellente',   icon: '🌟', color: '#FFD700' },
  { min: 70, label: 'Buono',        icon: '✅', color: '#4CAF50' },
  { min: 50, label: 'Sufficiente',  icon: '📗', color: '#FF9800' },
  { min: 0,  label: 'Da rivedere',  icon: '📕', color: '#F44336' },
];

// ── Valutazione ─────────────────────────────────────────────────────

/**
 * Calcola lo score (0-100) dato un array di domande e le risposte dell'utente.
 * @param questions Array di domande con correctIndex
 * @param answers Array di indici scelti dall'utente (stessa lunghezza di questions)
 */
export function evaluateAnswers(questions: AssessmentQuestion[], answers: number[]): number {
  if (questions.length === 0) return 100; // Nessuna domanda = pass automatico

  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correctIndex) {
      correct++;
    }
  }

  return Math.round((correct / questions.length) * 100);
}

/**
 * Ritorna label, icona e colore per uno score dato.
 */
export function getScoreInfo(score: number): { label: string; icon: string; color: string } {
  for (const tier of SCORE_LABELS) {
    if (score >= tier.min) {
      return { label: tier.label, icon: tier.icon, color: tier.color };
    }
  }
  return SCORE_LABELS[SCORE_LABELS.length - 1];
}

/**
 * Determina se lo score è sufficiente per sbloccare la lezione successiva.
 */
export function shouldUnlockNext(score: number): boolean {
  return score >= PASS_THRESHOLD;
}

/**
 * Genera un messaggio di feedback basato sullo score.
 */
export function getFeedbackMessage(score: number, lessonTitle: string): string {
  const info = getScoreInfo(score);

  if (score >= 90) {
    return `${info.icon} ${info.label}! Hai dimostrato un'ottima padronanza di "${lessonTitle}". Puoi procedere alla lezione successiva.`;
  }
  if (score >= 70) {
    return `${info.icon} ${info.label}! Hai una buona comprensione di "${lessonTitle}". Lezione successiva sbloccata.`;
  }
  if (score >= 50) {
    return `${info.icon} ${info.label}. Hai superato la soglia minima per "${lessonTitle}". Considera di rivedere i punti dove hai sbagliato prima di procedere.`;
  }
  return `${info.icon} ${info.label}. Il punteggio per "${lessonTitle}" è insufficiente. Ti consigliamo di ripetere la lezione e ritentare il quiz.`;
}

/**
 * Verifica dettagliata: per ogni domanda, indica se la risposta è corretta.
 */
export function getDetailedResults(
  questions: AssessmentQuestion[],
  answers: number[]
): Array<{
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}> {
  return questions.map((q, i) => ({
    question: q.question,
    userAnswer: q.options[answers[i]] || '—',
    correctAnswer: q.options[q.correctIndex] || '—',
    isCorrect: answers[i] === q.correctIndex,
    explanation: q.explanation,
  }));
}
