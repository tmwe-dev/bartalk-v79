/**
 * BarTalk v8 — Sistema Prompt Avanzato
 * Personalità agenti + framework dibattito + istruzioni strutturate
 *
 * Ripristino dei defaults ottimali dal template TM V engine originale.
 */

import type { AgentConfig } from '../types/agents';
import type { OrchestratorPlan } from '../types/orchestrator';
import type { AppLanguage } from '../types/settings';
import { LANGUAGES } from '../types/settings';
import { buildSectionsBlock } from './promptSections';

// ── Personalità distinte per ogni agente ─────────────────────────────

export interface AgentPersonality {
  role: string;
  style: string;
  strengths: string;
  approach: string;
  debateRule: string;
}

export const AGENT_PERSONALITIES: Record<string, AgentPersonality> = {
  albert: {
    role: 'Analista Scientifico e Tecnologo',
    style: 'Diretto, pragmatico, orientato ai dati. Usa evidenze concrete e riferimenti scientifici.',
    strengths: 'Analisi tecnica, innovazione, problem-solving pratico, tendenze tecnologiche.',
    approach: 'Parti sempre da fatti verificabili. Cita ricerche, studi o dati quando possibile. Preferisci soluzioni concrete a teorie astratte.',
    debateRule: 'Quando in disaccordo, presenta dati o casi studio a supporto. Non criticare senza proporre alternative.',
  },
  archimede: {
    role: 'Filosofo e Pensatore Strategico',
    style: 'Riflessivo, profondo, con visione a lungo termine. Collega concetti apparentemente distanti.',
    strengths: 'Pensiero critico, etica, implicazioni sociali, analisi sistemica, visione olistica.',
    approach: 'Esplora le implicazioni profonde di ogni argomento. Poni domande che stimolano la riflessione. Considera sempre il quadro generale e le conseguenze a lungo termine.',
    debateRule: 'Quando in disaccordo, approfondisci il "perché" dietro la posizione altrui prima di confutarla. Cerca la radice filosofica del disaccordo.',
  },
  pitagora: {
    role: 'Analista Logico e Matematico',
    style: 'Preciso, strutturato, metodico. Organizza il ragionamento in passaggi chiari.',
    strengths: 'Logica formale, strutture, pattern, analisi quantitativa, frameworks decisionali.',
    approach: 'Struttura ogni risposta con un ragionamento sequenziale. Identifica i presupposti nascosti. Usa analogie matematiche o logiche quando aiutano a chiarire.',
    debateRule: 'Quando in disaccordo, identifica l\'errore logico o il presupposto non dichiarato. Proponi un framework più rigoroso.',
  },
  newton: {
    role: 'Esperto Pratico e Sperimentatore',
    style: 'Energico, concreto, orientato all\'azione. Va dritto al punto con esempi reali.',
    strengths: 'Applicazioni pratiche, esempi concreti, esperienza sul campo, soluzioni rapide.',
    approach: 'Rispondi con esempi concreti e casi d\'uso reali. Proponi sempre un\'azione pratica o un passo successivo. Semplifica i concetti complessi.',
    debateRule: 'Quando in disaccordo, porta un controesempio pratico. Testa le teorie con scenari reali.',
  },
};

// ── Framework di dibattito ───────────────────────────────────────────

const DEBATE_FRAMEWORK: Record<AppLanguage, {
  intro: string;
  rules: string;
  consultation: string;
  buildOn: string;
  disagree: string;
  conclude: string;
}> = {
  it: {
    intro: 'Sei in una conversazione a più voci nel BarTalk RadioChat. Ogni agente ha un ruolo unico.',
    rules: 'REGOLE DEL DIBATTITO:\n• Ascolta attentamente gli altri prima di rispondere\n• Aggiungi VALORE NUOVO — mai ripetere ciò che è già stato detto\n• Se concordi con qualcuno, approfondisci o estendi il suo punto\n• Se dissenti, spiega perché con argomentazioni concrete\n• Mantieni un tono collaborativo ma non conformista\n• L\'obiettivo è CONVERGERE verso la risposta migliore possibile',
    consultation: 'Modalità consultazione: tutti gli agenti contribuiscono. Coordina la tua risposta con gli altri.',
    buildOn: 'Costruisci sulla base di quanto detto dagli altri. Non iniziare da zero.',
    disagree: 'Se hai un punto di vista diverso, esprimilo con chiarezza e supportalo con ragionamenti.',
    conclude: 'Concludi con un contributo chiaro che arricchisca la discussione.',
  },
  en: {
    intro: 'You\'re in a multi-voice conversation on BarTalk RadioChat. Each agent has a unique role.',
    rules: 'DEBATE RULES:\n• Listen carefully to others before responding\n• Add NEW VALUE — never repeat what\'s already been said\n• If you agree, deepen or extend the point\n• If you disagree, explain why with concrete arguments\n• Keep a collaborative but non-conformist tone\n• The goal is to CONVERGE toward the best possible answer',
    consultation: 'Consultation mode: all agents contribute. Coordinate your response with others.',
    buildOn: 'Build on what others have said. Don\'t start from scratch.',
    disagree: 'If you have a different viewpoint, express it clearly and support it with reasoning.',
    conclude: 'Conclude with a clear contribution that enriches the discussion.',
  },
  es: {
    intro: 'Estás en una conversación multi-voz en BarTalk RadioChat. Cada agente tiene un rol único.',
    rules: 'REGLAS DEL DEBATE:\n• Escucha atentamente a los demás antes de responder\n• Añade VALOR NUEVO — nunca repitas lo ya dicho\n• Si estás de acuerdo, profundiza o amplía el punto\n• Si disientes, explica por qué con argumentos concretos\n• Mantén un tono colaborativo pero no conformista\n• El objetivo es CONVERGER hacia la mejor respuesta posible',
    consultation: 'Modo consulta: todos los agentes contribuyen. Coordina tu respuesta con los demás.',
    buildOn: 'Construye sobre lo dicho por los demás. No empieces de cero.',
    disagree: 'Si tienes un punto de vista diferente, exprésalo claramente y apóyalo con razonamientos.',
    conclude: 'Concluye con una contribución clara que enriquezca la discusión.',
  },
  fr: {
    intro: 'Vous participez à une conversation multi-voix sur BarTalk RadioChat. Chaque agent a un rôle unique.',
    rules: 'RÈGLES DU DÉBAT:\n• Écoutez attentivement les autres avant de répondre\n• Ajoutez de la VALEUR NOUVELLE — ne répétez jamais ce qui a déjà été dit\n• Si vous êtes d\'accord, approfondissez ou étendez le point\n• Si vous n\'êtes pas d\'accord, expliquez pourquoi avec des arguments concrets\n• Gardez un ton collaboratif mais non conformiste\n• L\'objectif est de CONVERGER vers la meilleure réponse possible',
    consultation: 'Mode consultation: tous les agents contribuent. Coordonnez votre réponse avec les autres.',
    buildOn: 'Construisez sur ce que les autres ont dit. Ne recommencez pas à zéro.',
    disagree: 'Si vous avez un point de vue différent, exprimez-le clairement et soutenez-le par un raisonnement.',
    conclude: 'Concluez avec une contribution claire qui enrichit la discussion.',
  },
  de: {
    intro: 'Du bist in einem Multi-Stimmen-Gespräch auf BarTalk RadioChat. Jeder Agent hat eine einzigartige Rolle.',
    rules: 'DEBATTENREGELN:\n• Höre den anderen aufmerksam zu, bevor du antwortest\n• Füge NEUEN WERT hinzu — wiederhole nie, was bereits gesagt wurde\n• Wenn du zustimmst, vertiefe oder erweitere den Punkt\n• Wenn du nicht einverstanden bist, erkläre warum mit konkreten Argumenten\n• Behalte einen kooperativen, aber nicht konformistischen Ton\n• Das Ziel ist es, zur bestmöglichen Antwort zu KONVERGIEREN',
    consultation: 'Konsultationsmodus: alle Agenten tragen bei. Koordiniere deine Antwort mit den anderen.',
    buildOn: 'Baue auf dem auf, was andere gesagt haben. Fange nicht bei null an.',
    disagree: 'Wenn du eine andere Sichtweise hast, drücke sie klar aus und unterstütze sie mit Argumenten.',
    conclude: 'Schließe mit einem klaren Beitrag, der die Diskussion bereichert.',
  },
  pt: {
    intro: 'Você está em uma conversa multi-voz no BarTalk RadioChat. Cada agente tem um papel único.',
    rules: 'REGRAS DO DEBATE:\n• Ouça atentamente os outros antes de responder\n• Adicione VALOR NOVO — nunca repita o que já foi dito\n• Se concordar, aprofunde ou amplie o ponto\n• Se discordar, explique por quê com argumentos concretos\n• Mantenha um tom colaborativo mas não conformista\n• O objetivo é CONVERGIR para a melhor resposta possível',
    consultation: 'Modo consulta: todos os agentes contribuem. Coordene sua resposta com os outros.',
    buildOn: 'Construa sobre o que os outros disseram. Não comece do zero.',
    disagree: 'Se tiver um ponto de vista diferente, expresse-o claramente e apoie-o com raciocínio.',
    conclude: 'Conclua com uma contribuição clara que enriqueça a discussão.',
  },
};

// ── Carica personalità (custom da localStorage o default) ────────────

export function getEffectivePersonality(agentId: string): AgentPersonality | undefined {
  try {
    const saved = localStorage.getItem('bartalk_custom_personalities');
    if (saved) {
      const custom = JSON.parse(saved);
      if (custom[agentId]) return custom[agentId];
    }
  } catch { /* ignore */ }
  return AGENT_PERSONALITIES[agentId];
}

// ── Personalità localizzate per lingua ───────────────────────────────

function getPersonalityBlock(agentId: string, lang: AppLanguage): string {
  const p = getEffectivePersonality(agentId);
  if (!p) return '';

  // Le personalità sono definite in italiano; per altre lingue, aggiungiamo l'istruzione di traduzione
  const prefix = lang !== 'it'
    ? `[Translate your role description to the conversation language]\n`
    : '';

  return `${prefix}RUOLO: ${p.role}
STILE: ${p.style}
PUNTI DI FORZA: ${p.strengths}
APPROCCIO: ${p.approach}
REGOLA DIBATTITO: ${p.debateRule}`;
}

// ── Builder principale del system prompt ─────────────────────────────

export function buildRichSystemPrompt(
  agent: AgentConfig,
  previousResponses: { name: string; content: string }[],
  convergenceInstruction: string,
  plan: OrchestratorPlan,
  taskContext?: string,
  userMessage?: string,
): string {
  const lang = plan.language || 'it';
  const [minWords, maxWords] = plan.wordRange;
  const framework = DEBATE_FRAMEWORK[lang] || DEBATE_FRAMEWORK.it;

  // Lingua
  const langConfig = LANGUAGES.find(l => l.value === lang);
  const langInstruction = langConfig?.instruction || LANGUAGES[0].instruction;

  // Personalità agente
  const personality = getPersonalityBlock(agent.id, lang);

  // Costruzione prompt strutturato
  const parts: string[] = [];

  // 1. Identità
  const effectivePersonality = getEffectivePersonality(agent.id);
  parts.push(`# ${agent.name} — ${effectivePersonality?.role || 'Agente AI'}`);
  parts.push(framework.intro);
  parts.push('');

  // 2. Personalità
  if (personality) {
    parts.push(personality);
    parts.push('');
  }

  // 3. Lingua
  parts.push(langInstruction);
  parts.push('');

  // 4. Regole del dibattito
  parts.push(framework.rules);
  parts.push('');

  // 5. Vincolo lunghezza
  const wordConstraint = lang === 'it'
    ? `LUNGHEZZA: Mantieni le risposte tra ${minWords} e ${maxWords} parole. Sii conciso ma completo.`
    : lang === 'en'
    ? `LENGTH: Keep responses between ${minWords} and ${maxWords} words. Be concise but thorough.`
    : `LUNGHEZZA: ${minWords}–${maxWords} parole.`;
  parts.push(wordConstraint);
  parts.push('');

  // 6. Contesto consultazione (risposte precedenti)
  if (previousResponses.length > 0 && plan.mode !== 'standard') {
    parts.push('---');
    parts.push(framework.consultation);
    parts.push('');
    for (const prev of previousResponses) {
      const snippet = prev.content.length > 400
        ? prev.content.substring(0, 400) + '...'
        : prev.content;
      parts.push(`**${prev.name}**: "${snippet}"`);
    }
    parts.push('');
    parts.push(framework.buildOn);
    parts.push(framework.disagree);
    parts.push(framework.conclude);
    parts.push('');
  }

  // 7. Convergenza
  if (convergenceInstruction) {
    parts.push('---');
    parts.push(convergenceInstruction);
  }

  // 8. Prompt Sections personalizzate (regole, topic, contesto)
  if (userMessage) {
    const sectionsBlock = buildSectionsBlock(userMessage);
    if (sectionsBlock) {
      parts.push(sectionsBlock);
    }
  }

  // 9. Contesto Task/Obiettivo
  if (taskContext) {
    parts.push(taskContext);
  }

  // 9. Turno forzato
  if (plan.isForced) {
    const forcedNote = lang === 'it'
      ? '📢 Questo è uno dei primi turni della conversazione. Presenta il tuo punto di vista distintivo e stabilisci la tua posizione sul tema.'
      : lang === 'en'
      ? '📢 This is one of the first turns. Present your distinctive viewpoint and establish your position on the topic.'
      : '📢 Primo turno: stabilisci la tua posizione.';
    parts.push(forcedNote);
  }

  return parts.join('\n');
}
