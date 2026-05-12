/**
 * BarTalk v8 — LTI Context Provider
 * Rileva se l'app e stata lanciata via LTI da un LMS.
 * Espone: isLTIMode, platformInfo, submitGrade()
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  extractLTIFromURL,
  cleanLTIParams,
  submitGradeToLMS,
  type LTIGradeResult,
} from '../lib/ltiHelper';

// ── Context Types ───────────────────────────────────────────────────

interface LTIContextValue {
  /** Se l'app e in modalita LTI (lanciata da LMS) */
  isLTIMode: boolean;
  /** Nome della piattaforma LMS */
  platformName: string | null;
  /** Titolo del contesto LMS (es. nome corso nel LMS) */
  contextTitle: string | null;
  /** Token della sessione LTI */
  ltiToken: string | null;
  /** Launch ID (per submit grade) */
  launchId: string | null;
  /** Invia voto al LMS */
  submitGrade: (score: number, courseId?: string, lessonIndex?: number) => Promise<LTIGradeResult>;
}

const LTICtx = createContext<LTIContextValue | null>(null);

// ── localStorage key per persistere la sessione LTI ─────────────────
const LS_LTI_SESSION = 'bt_lti_session';

interface StoredLTISession {
  token: string;
  platformName: string | null;
  contextTitle: string | null;
  launchId: string | null;
  storedAt: string;
}

// ── Provider ────────────────────────────────────────────────────────

export function LTIProvider({ children }: { children: ReactNode }) {
  const [isLTIMode, setIsLTIMode] = useState(false);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [contextTitle, setContextTitle] = useState<string | null>(null);
  const [ltiToken, setLtiToken] = useState<string | null>(null);
  const [launchId, setLaunchId] = useState<string | null>(null);

  // ── Detect LTI on mount ──
  useEffect(() => {
    // 1. Controlla URL params (fresh launch dal LMS)
    const params = extractLTIFromURL();

    if (params.isLTI && params.token) {
      setIsLTIMode(true);
      setLtiToken(params.token);
      setPlatformName(params.platformName);
      setContextTitle(params.contextTitle);

      // Decodifica launchId dal token (JWT payload)
      try {
        const payloadB64 = params.token.split('.')[1];
        const payload = JSON.parse(atob(payloadB64));
        setLaunchId(payload.lti_launch_id || null);
      } catch { /* token non decodificabile */ }

      // Persisti in localStorage
      try {
        const session: StoredLTISession = {
          token: params.token,
          platformName: params.platformName,
          contextTitle: params.contextTitle,
          launchId: null,
          storedAt: new Date().toISOString(),
        };
        localStorage.setItem(LS_LTI_SESSION, JSON.stringify(session));
      } catch { /* localStorage pieno */ }

      // Pulisci URL
      cleanLTIParams();
      return;
    }

    // 2. Controlla localStorage (sessione LTI persistita)
    try {
      const raw = localStorage.getItem(LS_LTI_SESSION);
      if (raw) {
        const session: StoredLTISession = JSON.parse(raw);
        // Verifica che non sia scaduta (max 4h)
        const storedAt = new Date(session.storedAt).getTime();
        if (Date.now() - storedAt < 4 * 60 * 60 * 1000) {
          setIsLTIMode(true);
          setLtiToken(session.token);
          setPlatformName(session.platformName);
          setContextTitle(session.contextTitle);
          setLaunchId(session.launchId);
          return;
        }
        // Scaduta — rimuovi
        localStorage.removeItem(LS_LTI_SESSION);
      }
    } catch { /* ignora */ }
  }, []);

  // ── Submit Grade ──
  const submitGrade = useCallback(async (
    score: number,
    courseId?: string,
    lessonIndex?: number,
  ): Promise<LTIGradeResult> => {
    if (!isLTIMode || !launchId) {
      return { ok: false, gradeSubmitted: false, error: 'Not in LTI mode or no launch ID' };
    }

    return submitGradeToLMS({
      launchId,
      score,
      courseId,
      lessonIndex,
    });
  }, [isLTIMode, launchId]);

  return (
    <LTICtx.Provider value={{
      isLTIMode,
      platformName,
      contextTitle,
      ltiToken,
      launchId,
      submitGrade,
    }}>
      {children}
    </LTICtx.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────

export function useLTI(): LTIContextValue {
  const ctx = useContext(LTICtx);
  if (!ctx) throw new Error('useLTI must be used within LTIProvider');
  return ctx;
}
