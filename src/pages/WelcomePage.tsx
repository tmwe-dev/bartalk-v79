/**
 * BarTalk v8.2 — Welcome / Onboarding Page
 * Flusso di onboarding con selezione piano e overview features.
 * Rotta: /welcome
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { UI } from '../lib/constants';
import './WelcomePage.css';

type OnboardingStep = 'intro' | 'plan' | 'agents' | 'ready';

interface PlanInfo {
  id: string;
  name: string;
  price: string;
  features: string[];
  highlighted: boolean;
}

const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: '€0/mese',
    features: [
      'Fino a 3 agenti AI',
      '50 messaggi/giorno',
      'Cronologia 7 giorni',
      'Modalità radio base',
    ],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€9.99/mese',
    features: [
      'Agenti illimitati',
      'Messaggi illimitati',
      'Cronologia illimitata',
      'Upload file (PDF, DOCX, XLSX)',
      'Podcast mode avanzato',
      'Supporto prioritario',
      'Per professionisti',
    ],
    highlighted: true,
  },
];

const AGENTS_PREVIEW = [
  { name: 'Albert', model: 'OpenAI GPT-4o', color: '#10B981', emoji: '🧪', desc: 'Analitico e preciso' },
  { name: 'Archimede', model: 'Anthropic Claude', color: '#8B5CF6', emoji: '🏛️', desc: 'Creativo e riflessivo' },
  { name: 'Pitagora', model: 'Google Gemini', color: '#3B82F6', emoji: '📐', desc: 'Logico e strutturato' },
  { name: 'Newton', model: 'Groq Llama', color: '#F59E0B', emoji: '🍎', desc: 'Veloce e diretto' },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('bartalk_onboarding_completed', 'true');
    localStorage.setItem('bartalk_selected_plan', selectedPlan);
    navigate('/radio-chat');
  }, [selectedPlan, navigate]);

  const nextStep = useCallback(() => {
    const steps: OnboardingStep[] = ['intro', 'plan', 'agents', 'ready'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    } else {
      completeOnboarding();
    }
  }, [step, completeOnboarding]);

  const prevStep = useCallback(() => {
    const steps: OnboardingStep[] = ['intro', 'plan', 'agents', 'ready'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }, [step]);

  return (
    <div className="welcome-page" role="main" aria-label="Onboarding BarTalk">
      <a href="#welcome-content" className="sr-only focus-visible">Salta al contenuto</a>
      <div className="welcome-container" id="welcome-content">
        {/* Progress dots */}
        <nav className="welcome-progress" aria-label="Progresso onboarding" role="progressbar" aria-valuenow={['intro', 'plan', 'agents', 'ready'].indexOf(step) + 1} aria-valuemin={1} aria-valuemax={4}>
          {['intro', 'plan', 'agents', 'ready'].map((s, i) => (
            <div key={s} className={`progress-dot ${step === s ? 'active' : ''} ${['intro', 'plan', 'agents', 'ready'].indexOf(step) > i ? 'completed' : ''}`} aria-label={`Step ${i + 1}${step === s ? ' (corrente)' : ''}`} />
          ))}
        </nav>

        {/* ── STEP: Intro ── */}
        {step === 'intro' && (
          <div className="welcome-step fade-in">
            <div className="welcome-logo">🎙️</div>
            <h1 className="welcome-title">{UI.appName}</h1>
            <p className="welcome-subtitle">Radio Chat con 4 Agenti AI</p>
            <p className="welcome-desc">
              Benvenuto in BarTalk! Quattro agenti AI con personalità uniche discutono,
              dibattono e collaborano per darti le risposte migliori. Come una radio
              dove ogni voce porta una prospettiva diversa.
            </p>
            {user && <p className="welcome-user">Ciao, {user.displayName || user.email}!</p>}
            <button className="welcome-btn primary" onClick={nextStep}>
              Iniziamo →
            </button>
            <button className="welcome-btn text" onClick={() => navigate('/radio-chat')}>
              Salta configurazione
            </button>
          </div>
        )}

        {/* ── STEP: Plan Selection ── */}
        {step === 'plan' && (
          <div className="welcome-step fade-in">
            <h2 className="welcome-step-title">Scegli il tuo piano</h2>
            <p className="welcome-step-desc">Puoi cambiare piano in qualsiasi momento dalle impostazioni.</p>

            <div className="plans-grid" role="radiogroup" aria-label="Selezione piano">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`plan-card ${plan.highlighted ? 'highlighted' : ''} ${selectedPlan === plan.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlan(plan.id); } }}
                  role="radio"
                  aria-checked={selectedPlan === plan.id}
                  aria-label={`Piano ${plan.name} — ${plan.price}`}
                  tabIndex={0}
                >
                  {plan.highlighted && <div className="plan-badge" aria-label="Piano consigliato">Consigliato</div>}
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">{plan.price}</div>
                  <ul className="plan-features" aria-label={`Feature piano ${plan.name}`}>
                    {plan.features.map((f, i) => (
                      <li key={i}>✓ {f}</li>
                    ))}
                  </ul>
                  <div className="plan-select-indicator" aria-hidden="true">
                    {selectedPlan === plan.id ? '● Selezionato' : '○ Seleziona'}
                  </div>
                </div>
              ))}
            </div>

            <div className="welcome-nav">
              <button className="welcome-btn secondary" onClick={prevStep}>← Indietro</button>
              <button className="welcome-btn primary" onClick={nextStep}>Avanti →</button>
            </div>
          </div>
        )}

        {/* ── STEP: Agents Preview ── */}
        {step === 'agents' && (
          <div className="welcome-step fade-in">
            <h2 className="welcome-step-title">I tuoi Agenti AI</h2>
            <p className="welcome-step-desc">Ogni agente ha la propria personalità e specializzazione.</p>

            <div className="agents-preview-grid" role="list" aria-label="Agenti AI disponibili">
              {AGENTS_PREVIEW.map(agent => (
                <div key={agent.name} className="agent-preview-card" style={{ borderColor: agent.color }} role="listitem" aria-label={`${agent.name} — ${agent.desc}`}>
                  <div className="agent-preview-emoji" aria-hidden="true">{agent.emoji}</div>
                  <h3 className="agent-preview-name" style={{ color: agent.color }}>{agent.name}</h3>
                  <div className="agent-preview-model">{agent.model}</div>
                  <div className="agent-preview-desc">{agent.desc}</div>
                </div>
              ))}
            </div>

            <div className="welcome-nav">
              <button className="welcome-btn secondary" onClick={prevStep}>← Indietro</button>
              <button className="welcome-btn primary" onClick={nextStep}>Avanti →</button>
            </div>
          </div>
        )}

        {/* ── STEP: Ready ── */}
        {step === 'ready' && (
          <div className="welcome-step fade-in">
            <div className="welcome-ready-icon">🚀</div>
            <h2 className="welcome-step-title">Tutto pronto!</h2>
            <p className="welcome-step-desc">
              Piano: <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong>
              {' · '}4 agenti AI pronti a conversare
            </p>
            <p className="welcome-tip">
              Suggerimento: prova a chiedere qualcosa e guarda i 4 agenti rispondere con prospettive diverse.
              Usa il carosello 3D per navigare tra le risposte!
            </p>

            <div className="welcome-nav">
              <button className="welcome-btn secondary" onClick={prevStep}>← Indietro</button>
              <button className="welcome-btn primary large" onClick={completeOnboarding}>
                Entra in BarTalk 🎙️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
