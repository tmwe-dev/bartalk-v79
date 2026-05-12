/**
 * BarTalk v8 — Student Onboarding
 * Flow di onboarding per creare il profilo studente.
 */

import { useState } from 'react';
import { useMaestroContext } from '../../context/MaestroContext';
import { VoiceMicButton } from '../Shared/VoiceMicButton';
import type { LearningStyle } from '../../types/maestro';
import { LEARNING_STYLE_META } from '../../types/maestro';

interface StudentOnboardingProps {
  onComplete: () => void;
}

type OnboardingStep = 'name' | 'about' | 'style' | 'goals' | 'done';

export function StudentOnboarding({ onComplete }: StudentOnboardingProps) {
  const { saveStudentProfile } = useMaestroContext();

  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [interests, setInterests] = useState('');
  const [learningStyle, setLearningStyle] = useState<LearningStyle>('reading');
  const [goals, setGoals] = useState('');
  const [challenges, setChallenges] = useState('');

  const handleComplete = () => {
    saveStudentProfile({
      name: name.trim(),
      age: age ? parseInt(age) : undefined,
      occupation: occupation.trim() || undefined,
      interests: interests
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
      learningStyle,
      goals: goals
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
      challenges: challenges
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
      techComfort: 'medium',
      nativeLanguage: 'it',
    });
    setStep('done');
    setTimeout(onComplete, 800);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-progress">
          {(['name', 'about', 'style', 'goals'] as OnboardingStep[]).map((s, i) => (
            <div
              key={s}
              className={`onboarding-dot ${step === s ? 'active' : ''} ${
                ['name', 'about', 'style', 'goals'].indexOf(step) > i ? 'completed' : ''
              }`}
            />
          ))}
        </div>

        {/* Step: Nome */}
        {step === 'name' && (
          <div className="onboarding-step">
            <div className="onboarding-emoji">👋</div>
            <h2>Benvenuto!</h2>
            <p>Come ti chiami? Il tuo maestro vorrebbe conoscerti.</p>
            <div className="voice-input-row">
              <input
                className="onboarding-input"
                type="text"
                placeholder="Il tuo nome"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('about')}
              />
              <VoiceMicButton onTranscript={setName} />
            </div>
            <button
              className="onboarding-btn primary"
              onClick={() => setStep('about')}
              disabled={!name.trim()}
            >
              Avanti →
            </button>
          </div>
        )}

        {/* Step: Chi sei */}
        {step === 'about' && (
          <div className="onboarding-step">
            <div className="onboarding-emoji">🧑</div>
            <h2>Parliamo di te, {name}!</h2>
            <p>Qualche info per personalizzare le lezioni.</p>

            <div className="onboarding-field">
              <label>Età</label>
              <input
                className="onboarding-input small"
                type="number"
                placeholder="es. 25"
                value={age}
                onChange={e => setAge(e.target.value)}
              />
            </div>

            <div className="onboarding-field">
              <label>Occupazione</label>
              <div className="voice-input-row">
                <input
                  className="onboarding-input"
                  type="text"
                  placeholder="es. studente, ingegnere..."
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                />
                <VoiceMicButton onTranscript={setOccupation} />
              </div>
            </div>

            <div className="onboarding-field">
              <label>Interessi</label>
              <div className="voice-input-row">
                <input
                  className="onboarding-input"
                  type="text"
                  placeholder="es. musica, sport, tecnologia..."
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                />
                <VoiceMicButton onTranscript={setInterests} />
              </div>
            </div>

            <div className="onboarding-nav">
              <button className="onboarding-btn secondary" onClick={() => setStep('name')}>
                ← Indietro
              </button>
              <button className="onboarding-btn primary" onClick={() => setStep('style')}>
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step: Stile di apprendimento */}
        {step === 'style' && (
          <div className="onboarding-step">
            <div className="onboarding-emoji">🧠</div>
            <h2>Come preferisci imparare?</h2>
            <p>Scegli lo stile che ti rappresenta di più.</p>

            <div className="onboarding-style-grid">
              {(Object.entries(LEARNING_STYLE_META) as [LearningStyle, typeof LEARNING_STYLE_META[LearningStyle]][]).map(
                ([key, meta]) => (
                  <button
                    key={key}
                    className={`onboarding-style-card ${learningStyle === key ? 'selected' : ''}`}
                    onClick={() => setLearningStyle(key)}
                  >
                    <span className="style-icon">{meta.icon}</span>
                    <span className="style-label">{meta.label}</span>
                    <span className="style-desc">{meta.description}</span>
                  </button>
                ),
              )}
            </div>

            <div className="onboarding-nav">
              <button className="onboarding-btn secondary" onClick={() => setStep('about')}>
                ← Indietro
              </button>
              <button className="onboarding-btn primary" onClick={() => setStep('goals')}>
                Avanti →
              </button>
            </div>
          </div>
        )}

        {/* Step: Obiettivi e difficoltà */}
        {step === 'goals' && (
          <div className="onboarding-step">
            <div className="onboarding-emoji">🎯</div>
            <h2>I tuoi obiettivi</h2>
            <p>Cosa vuoi raggiungere? Quali sono le tue difficoltà?</p>

            <div className="onboarding-field">
              <label>Obiettivi</label>
              <div className="voice-input-row voice-input-row--textarea">
                <textarea
                  className="onboarding-textarea"
                  placeholder="es. superare l'esame, migliorare la conversazione..."
                  value={goals}
                  onChange={e => setGoals(e.target.value)}
                  rows={2}
                />
                <VoiceMicButton onTranscript={setGoals} />
              </div>
            </div>

            <div className="onboarding-field">
              <label>Difficoltà</label>
              <div className="voice-input-row voice-input-row--textarea">
                <textarea
                  className="onboarding-textarea"
                  placeholder="es. grammatica, comprensione orale..."
                  value={challenges}
                  onChange={e => setChallenges(e.target.value)}
                  rows={2}
                />
                <VoiceMicButton onTranscript={setChallenges} />
              </div>
            </div>

            <div className="onboarding-nav">
              <button className="onboarding-btn secondary" onClick={() => setStep('style')}>
                ← Indietro
              </button>
              <button className="onboarding-btn primary" onClick={handleComplete}>
                Iniziamo! ✨
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="onboarding-step onboarding-done">
            <div className="onboarding-emoji">🎉</div>
            <h2>Tutto pronto!</h2>
            <p>Il tuo profilo è stato creato. Buono studio!</p>
            {/* Bottone fallback: se il setTimeout non funziona, l'utente può cliccare manualmente */}
            <button
              className="onboarding-btn primary"
              onClick={onComplete}
              style={{ marginTop: '16px' }}
            >
              Continua →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
