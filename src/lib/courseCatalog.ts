/**
 * @module courseCatalog
 * Prefabricated course catalog with template definitions.
 * Contains ready-to-use course templates across categories (languages, science,
 * humanities, etc.) with pre-defined lessons, objectives, and metadata.
 */

import type { CourseLevelType, CourseCategoryId } from '../types/courses';

// ── Specializzazione (focus) ────────────────────────────────────────

export interface CourseFocus {
  id: string;
  label: string;
  icon: string;
  description: string;
}

// ── Template prefabbricato ──────────────────────────────────────────

export interface CourseTemplate {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: CourseCategoryId;
  defaultLevel: CourseLevelType;
  availableLevels: CourseLevelType[];
  focuses: CourseFocus[];           // sotto-argomenti selezionabili
  suggestedCustomizations: string[]; // frasi-esempio per il campo customizzazione
  coverColor: string;               // gradient per la card
}

// ── Direzioni di customizzazione ────────────────────────────────────

/** CustomDirection type alias. */
export type CustomDirection = 'broader' | 'narrower' | 'practical' | 'theoretical';

/** CUSTOM_DIRECTIONS constant. */
export const CUSTOM_DIRECTIONS: { id: CustomDirection; label: string; icon: string; hint: string }[] = [
  { id: 'broader',     label: 'Più ampio',     icon: '🔭', hint: 'Copri più argomenti, panoramica generale' },
  { id: 'narrower',    label: 'Più specifico',  icon: '🔬', hint: 'Approfondisci un singolo aspetto nel dettaglio' },
  { id: 'practical',   label: 'Più pratico',    icon: '🛠️', hint: 'Esempi concreti, esercizi, applicazioni reali' },
  { id: 'theoretical', label: 'Più teorico',    icon: '📖', hint: 'Fondamenti, teorie, framework concettuali' },
];

// ══════════════════════════════════════════════════════════════════════
//  CATALOGO CORSI
// ══════════════════════════════════════════════════════════════════════

/** COURSE_CATALOG constant. */
export const COURSE_CATALOG: CourseTemplate[] = [

  // ── LINGUE ────────────────────────────────────────────────────────

  {
    id: 'english',
    title: 'Inglese',
    icon: '🇬🇧',
    description: 'Corso di lingua inglese con conversazione, grammatica e vocabolario',
    category: 'lingue',
    defaultLevel: 'intermedio',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario'],
    focuses: [
      { id: 'conversation', label: 'Conversazione', icon: '💬', description: 'Dialoghi, espressioni quotidiane, fluency' },
      { id: 'grammar', label: 'Grammatica', icon: '📝', description: 'Strutture grammaticali, tempi verbali, sintassi' },
      { id: 'business', label: 'Business English', icon: '💼', description: 'Inglese professionale, email, presentazioni' },
      { id: 'academic', label: 'Academic English', icon: '🎓', description: 'Scrittura accademica, essay, IELTS/TOEFL' },
    ],
    suggestedCustomizations: [
      'Concentrati sulle situazioni di viaggio',
      'Prepara per il colloquio di lavoro in inglese',
      'Focalizzati sui phrasal verbs più comuni',
    ],
    coverColor: 'linear-gradient(135deg, #1a237e, #42a5f5)',
  },
  {
    id: 'spanish',
    title: 'Spagnolo',
    icon: '🇪🇸',
    description: 'Corso di lingua spagnola dal livello base al avanzato',
    category: 'lingue',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'conversation', label: 'Conversazione', icon: '💬', description: 'Dialoghi, espressioni, pronuncia' },
      { id: 'grammar', label: 'Grammatica', icon: '📝', description: 'Coniugazioni, subjuntivo, preposizioni' },
      { id: 'latin-america', label: 'Spagnolo Latam', icon: '🌎', description: 'Varianti latinoamericane, slang, cultura' },
      { id: 'dele', label: 'Preparazione DELE', icon: '📋', description: 'Esame DELE A1-C2, strategie e pratica' },
    ],
    suggestedCustomizations: [
      'Focus sulla variante argentina',
      'Prepara per un viaggio in Spagna',
      'Spagnolo per il settore turistico',
    ],
    coverColor: 'linear-gradient(135deg, #b71c1c, #ff8f00)',
  },
  {
    id: 'french',
    title: 'Francese',
    icon: '🇫🇷',
    description: 'Lingua francese: pronuncia, grammatica e cultura',
    category: 'lingue',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'conversation', label: 'Conversazione', icon: '💬', description: 'Dialoghi, pronuncia, espressioni idiomatiche' },
      { id: 'grammar', label: 'Grammatica', icon: '📝', description: 'Coniugazioni, accordi, strutture complesse' },
      { id: 'culture', label: 'Lingua e Cultura', icon: '🗼', description: 'Letteratura, cinema, tradizioni francesi' },
    ],
    suggestedCustomizations: [
      'Francese per la ristorazione',
      'Prepara per il DELF B2',
      'Focus sulla conversazione telefonica',
    ],
    coverColor: 'linear-gradient(135deg, #1565c0, #e53935)',
  },

  // ── CUCINA ────────────────────────────────────────────────────────

  {
    id: 'italian-cooking',
    title: 'Cucina Italiana',
    icon: '🍝',
    description: 'L\'arte della cucina italiana: tecniche, ricette e tradizioni regionali',
    category: 'altro',
    defaultLevel: 'intermedio',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'pasta', label: 'Pasta', icon: '🍝', description: 'Pasta fresca, sughi classici, formati regionali' },
      { id: 'risotti', label: 'Risotti', icon: '🍚', description: 'Tecniche di cottura, brodi, mantecatura, varianti' },
      { id: 'carne', label: 'Carni', icon: '🥩', description: 'Tagli, cotture, arrosti, brasati, grigliate' },
      { id: 'pesce', label: 'Pesce', icon: '🐟', description: 'Pesce fresco, frutti di mare, crudi, zuppe' },
      { id: 'dolci', label: 'Dolci', icon: '🍰', description: 'Pasticceria italiana, tiramisù, cannoli, crostate' },
      { id: 'regionale', label: 'Cucina Regionale', icon: '🗺️', description: 'Piatti tipici regione per regione' },
    ],
    suggestedCustomizations: [
      'Solo ricette della tradizione napoletana',
      'Versioni senza glutine dei classici italiani',
      'Focus sulla cucina toscana con ingredienti di stagione',
      'Abbinamenti vino-cibo per ogni piatto',
    ],
    coverColor: 'linear-gradient(135deg, #2e7d32, #e65100)',
  },
  {
    id: 'world-cooking',
    title: 'Cucina del Mondo',
    icon: '🌍',
    description: 'Viaggio culinario attraverso le tradizioni gastronomiche internazionali',
    category: 'altro',
    defaultLevel: 'base',
    availableLevels: ['base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'japanese', label: 'Giapponese', icon: '🍣', description: 'Sushi, ramen, tempura, fermentazione' },
      { id: 'thai', label: 'Thailandese', icon: '🍜', description: 'Curry, pad thai, equilibrio dei sapori' },
      { id: 'french', label: 'Francese', icon: '🥐', description: 'Tecniche classiche, salse madri, pasticceria' },
      { id: 'indian', label: 'Indiana', icon: '🍛', description: 'Spezie, curry, pane naan, tandoori' },
      { id: 'mexican', label: 'Messicana', icon: '🌮', description: 'Tacos, mole, salse, tortillas' },
    ],
    suggestedCustomizations: [
      'Solo piatti vegetariani',
      'Ricette facili sotto i 30 minuti',
      'Tecniche di fermentazione e conservazione',
    ],
    coverColor: 'linear-gradient(135deg, #ff6f00, #d84315)',
  },

  // ── INFORMATICA ───────────────────────────────────────────────────

  {
    id: 'programming',
    title: 'Programmazione',
    icon: '💻',
    description: 'Impara a programmare: dai fondamenti ai linguaggi moderni',
    category: 'informatica',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario'],
    focuses: [
      { id: 'python', label: 'Python', icon: '🐍', description: 'Linguaggio versatile per data science, web, automazione' },
      { id: 'javascript', label: 'JavaScript', icon: '⚡', description: 'Web development, frontend e backend con Node.js' },
      { id: 'react', label: 'React', icon: '⚛️', description: 'Libreria UI: componenti, hooks, state management' },
      { id: 'algorithms', label: 'Algoritmi', icon: '🧮', description: 'Strutture dati, complessità, problem solving' },
      { id: 'ai-ml', label: 'AI & Machine Learning', icon: '🤖', description: 'Reti neurali, NLP, computer vision' },
    ],
    suggestedCustomizations: [
      'Focus su progetti pratici reali',
      'Prepara per colloqui tecnici (LeetCode style)',
      'Orientato allo sviluppo di app mobile',
    ],
    coverColor: 'linear-gradient(135deg, #1b5e20, #00e676)',
  },

  // ── SCIENZE ───────────────────────────────────────────────────────

  {
    id: 'physics',
    title: 'Fisica',
    icon: '⚛️',
    description: 'Dalle leggi di Newton alla meccanica quantistica',
    category: 'scienze',
    defaultLevel: 'intermedio',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario', 'ricercatore'],
    focuses: [
      { id: 'mechanics', label: 'Meccanica', icon: '🔧', description: 'Forze, moto, energia, momento angolare' },
      { id: 'electromagnetism', label: 'Elettromagnetismo', icon: '⚡', description: 'Campi, onde, circuiti, Maxwell' },
      { id: 'quantum', label: 'Quantistica', icon: '🌀', description: 'Principi fondamentali, equazione di Schrödinger' },
      { id: 'astro', label: 'Astrofisica', icon: '🌌', description: 'Stelle, galassie, cosmologia, buchi neri' },
    ],
    suggestedCustomizations: [
      'Con esperimenti pratici da fare a casa',
      'Approccio matematico rigoroso con dimostrazioni',
      'Connessioni con la vita quotidiana',
    ],
    coverColor: 'linear-gradient(135deg, #311b92, #7c4dff)',
  },

  // ── MEDICINA ──────────────────────────────────────────────────────

  {
    id: 'anatomy',
    title: 'Anatomia Umana',
    icon: '🫀',
    description: 'Studio sistematico del corpo umano con fonti certificate',
    category: 'medicina',
    defaultLevel: 'universitario',
    availableLevels: ['base', 'intermedio', 'avanzato', 'universitario', 'ricercatore'],
    focuses: [
      { id: 'muscular', label: 'Apparato Muscolare', icon: '💪', description: 'Muscoli, tendini, biomeccanica del movimento' },
      { id: 'cardiovascular', label: 'Cardiovascolare', icon: '🫀', description: 'Cuore, vasi, circolazione, patologie' },
      { id: 'nervous', label: 'Sistema Nervoso', icon: '🧠', description: 'SNC, SNP, neuroni, neurotrasmettitori' },
      { id: 'digestive', label: 'Apparato Digerente', icon: '🫁', description: 'Organi digestivi, metabolismo, nutrienti' },
    ],
    suggestedCustomizations: [
      'Orientato alla fisioterapia',
      'Con correlazioni cliniche e patologia',
      'Focus sulle tecniche di imaging diagnostico',
    ],
    coverColor: 'linear-gradient(135deg, #b71c1c, #ef5350)',
  },

  // ── PSICOLOGIA ────────────────────────────────────────────────────

  {
    id: 'psychology',
    title: 'Psicologia',
    icon: '🧠',
    description: 'Mente, comportamento e processi cognitivi con fonti scientifiche',
    category: 'psicologia',
    defaultLevel: 'avanzato',
    availableLevels: ['base', 'intermedio', 'avanzato', 'universitario', 'ricercatore'],
    focuses: [
      { id: 'cognitive', label: 'Cognitiva', icon: '🧩', description: 'Percezione, memoria, attenzione, decision making' },
      { id: 'clinical', label: 'Clinica', icon: '🏥', description: 'Disturbi, diagnosi DSM-5, trattamenti evidence-based' },
      { id: 'developmental', label: 'Dello Sviluppo', icon: '👶', description: 'Sviluppo infantile, adolescenza, ciclo di vita' },
      { id: 'social', label: 'Sociale', icon: '👥', description: 'Influenza sociale, gruppi, pregiudizi, persuasione' },
      { id: 'neuro', label: 'Neuropsicologia', icon: '🔬', description: 'Basi neurali del comportamento, brain imaging' },
    ],
    suggestedCustomizations: [
      'Focus sulle terapie cognitivo-comportamentali',
      'Approccio evidence-based con studi randomizzati',
      'Orientato alla psicologia del lavoro',
    ],
    coverColor: 'linear-gradient(135deg, #4a148c, #ce93d8)',
  },

  // ── MATEMATICA ────────────────────────────────────────────────────

  {
    id: 'mathematics',
    title: 'Matematica',
    icon: '📐',
    description: 'Dai fondamenti all\'analisi avanzata',
    category: 'matematica',
    defaultLevel: 'intermedio',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario', 'ricercatore'],
    focuses: [
      { id: 'calculus', label: 'Analisi', icon: '∫', description: 'Limiti, derivate, integrali, serie' },
      { id: 'algebra', label: 'Algebra', icon: '🔢', description: 'Algebra lineare, matrici, spazi vettoriali' },
      { id: 'statistics', label: 'Statistica', icon: '📊', description: 'Probabilità, distribuzioni, inferenza, test' },
      { id: 'geometry', label: 'Geometria', icon: '📐', description: 'Geometria euclidea, analitica, differenziale' },
    ],
    suggestedCustomizations: [
      'Con molti esercizi svolti passo-passo',
      'Applicazioni alla data science',
      'Prepara per il test di ingresso ingegneria',
    ],
    coverColor: 'linear-gradient(135deg, #0d47a1, #29b6f6)',
  },

  // ── ECONOMIA ──────────────────────────────────────────────────────

  {
    id: 'economics',
    title: 'Economia',
    icon: '📈',
    description: 'Micro e macroeconomia, finanza e mercati',
    category: 'economia',
    defaultLevel: 'intermedio',
    availableLevels: ['base', 'intermedio', 'avanzato', 'universitario'],
    focuses: [
      { id: 'micro', label: 'Microeconomia', icon: '🏪', description: 'Domanda, offerta, equilibrio, concorrenza' },
      { id: 'macro', label: 'Macroeconomia', icon: '🌐', description: 'PIL, inflazione, politica monetaria e fiscale' },
      { id: 'finance', label: 'Finanza', icon: '💰', description: 'Investimenti, portafoglio, derivati, risk management' },
      { id: 'behavioral', label: 'Economia Comportamentale', icon: '🧠', description: 'Bias cognitivi, nudge, decision making' },
    ],
    suggestedCustomizations: [
      'Con casi studio di aziende italiane',
      'Focus sul mercato crypto e blockchain',
      'Orientato alla gestione di una startup',
    ],
    coverColor: 'linear-gradient(135deg, #1b5e20, #ffd54f)',
  },

  // ── MUSICA ────────────────────────────────────────────────────────

  {
    id: 'music',
    title: 'Musica',
    icon: '🎵',
    description: 'Teoria musicale, composizione e storia della musica',
    category: 'musica',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'theory', label: 'Teoria', icon: '🎼', description: 'Note, scale, accordi, armonia, ritmo' },
      { id: 'piano', label: 'Pianoforte', icon: '🎹', description: 'Tecnica, repertorio, lettura spartiti' },
      { id: 'guitar', label: 'Chitarra', icon: '🎸', description: 'Accordi, fingerpicking, ritmica, improvvisazione' },
      { id: 'production', label: 'Produzione', icon: '🎛️', description: 'DAW, mixing, mastering, sound design' },
    ],
    suggestedCustomizations: [
      'Focus sul jazz e improvvisazione',
      'Prepara per esame di ammissione al conservatorio',
      'Produzione di beat hip-hop e trap',
    ],
    coverColor: 'linear-gradient(135deg, #880e4f, #f48fb1)',
  },

  // ── STORIA ────────────────────────────────────────────────────────

  {
    id: 'history',
    title: 'Storia',
    icon: '📜',
    description: 'Dalle civiltà antiche al mondo contemporaneo',
    category: 'storia',
    defaultLevel: 'intermedio',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario'],
    focuses: [
      { id: 'ancient', label: 'Antichità', icon: '🏛️', description: 'Grecia, Roma, Egitto, Mesopotamia' },
      { id: 'medieval', label: 'Medioevo', icon: '⚔️', description: 'Feudalesimo, Crociate, Rinascimento' },
      { id: 'modern', label: 'Età Moderna', icon: '🌍', description: 'Rivoluzioni, colonialismo, illuminismo' },
      { id: 'contemporary', label: 'Contemporanea', icon: '🌐', description: 'Guerre Mondiali, Guerra Fredda, globalizzazione' },
    ],
    suggestedCustomizations: [
      'Focus sulla storia d\'Italia',
      'Approccio geopolitico e strategico',
      'Con analisi di fonti primarie',
    ],
    coverColor: 'linear-gradient(135deg, #4e342e, #bcaaa4)',
  },

  // ══════════════════════════════════════════════════════════════════
  //  HUMAN FOUNDATION — CORPO / MENTE / SPIRITO (8-25 anni)
  // ══════════════════════════════════════════════════════════════════

  // ── CORPO ───────────────────────────────────────────────────────

  {
    id: 'fitness-giovani',
    title: 'Fitness & Movimento',
    icon: '🏋️',
    description: 'Allenamento, postura e movimento consapevole per ragazzi e giovani adulti (8-25)',
    category: 'sport',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'calisthenics', label: 'Calisthenics', icon: '💪', description: 'Corpo libero, progressioni, forza a peso corporeo' },
      { id: 'postura', label: 'Postura & Mobilità', icon: '🧍', description: 'Correzione posturale, stretching, prevenzione infortuni' },
      { id: 'sport-team', label: 'Sport di Squadra', icon: '⚽', description: 'Preparazione atletica per calcio, basket, volley' },
      { id: 'home-workout', label: 'Allenamento a Casa', icon: '🏠', description: 'Routine senza attrezzi, HIIT, tabata, circuiti' },
    ],
    suggestedCustomizations: [
      'Programma per migliorare nella corsa',
      'Allenamento per adolescenti che iniziano palestra',
      'Esercizi per chi sta molto seduto a studiare',
      'Preparazione atletica per sport specifico',
    ],
    coverColor: 'linear-gradient(135deg, #e65100, #ff9800)',
  },
  {
    id: 'nutrizione-giovani',
    title: 'Nutrizione & Alimentazione',
    icon: '🥗',
    description: 'Alimentazione sana, consapevole e bilanciata per crescere bene (8-25)',
    category: 'nutrizione',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'basi', label: 'Basi della Nutrizione', icon: '🍎', description: 'Macro e micronutrienti, piramide alimentare, idratazione' },
      { id: 'sport-nutrition', label: 'Nutrizione Sportiva', icon: '🏃', description: 'Alimentazione per performance, recupero, integrazione' },
      { id: 'cucina-sana', label: 'Cucina Sana & Facile', icon: '🍳', description: 'Ricette veloci, meal prep, snack sani' },
      { id: 'disturbi', label: 'Rapporto col Cibo', icon: '💛', description: 'Body positivity, alimentazione consapevole, miti da sfatare' },
    ],
    suggestedCustomizations: [
      'Alimentazione per uno studente universitario con budget limitato',
      'Dieta vegetariana bilanciata per adolescenti',
      'Come leggere le etichette alimentari',
      'Snack sani per lo studio e lo sport',
    ],
    coverColor: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
  },

  // ── MENTE ───────────────────────────────────────────────────────

  {
    id: 'intelligenza-emotiva',
    title: 'Intelligenza Emotiva',
    icon: '🧠',
    description: 'Gestione delle emozioni, empatia e relazioni sane per giovani (8-25)',
    category: 'crescita',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'emozioni', label: 'Riconoscere le Emozioni', icon: '🎭', description: 'Identificare, nominare e comprendere le proprie emozioni' },
      { id: 'relazioni', label: 'Relazioni Sane', icon: '🤝', description: 'Comunicazione assertiva, confini, gestione conflitti' },
      { id: 'autostima', label: 'Autostima & Identità', icon: '🌟', description: 'Valore personale, accettazione, crescita interiore' },
      { id: 'resilienza', label: 'Resilienza', icon: '🔥', description: 'Affrontare fallimenti, cambiamento, pressione sociale' },
    ],
    suggestedCustomizations: [
      'Focus su ansia da prestazione scolastica',
      'Gestione della rabbia per preadolescenti',
      'Come affrontare il bullismo con intelligenza emotiva',
      'Costruire fiducia in sé stessi dopo una delusione',
    ],
    coverColor: 'linear-gradient(135deg, #6a1b9a, #ab47bc)',
  },
  {
    id: 'metodo-studio',
    title: 'Metodo di Studio & Pensiero Critico',
    icon: '📖',
    description: 'Tecniche di apprendimento, concentrazione e ragionamento per studenti (8-25)',
    category: 'educazione',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato', 'universitario'],
    focuses: [
      { id: 'tecniche', label: 'Tecniche di Studio', icon: '📝', description: 'Pomodoro, spaced repetition, mappe mentali, Cornell notes' },
      { id: 'concentrazione', label: 'Focus & Concentrazione', icon: '🎯', description: 'Gestione distrazioni, deep work, digital detox' },
      { id: 'pensiero-critico', label: 'Pensiero Critico', icon: '🔍', description: 'Analisi fonti, bias cognitivi, argomentazione logica' },
      { id: 'creativita', label: 'Creatività & Problem Solving', icon: '💡', description: 'Pensiero laterale, brainstorming, innovazione' },
    ],
    suggestedCustomizations: [
      'Preparazione esami universitari con spaced repetition',
      'Come studiare efficacemente con ADHD',
      'Metodo per memorizzare grandi quantità di informazioni',
      'Imparare a distinguere notizie vere da fake news',
    ],
    coverColor: 'linear-gradient(135deg, #1565c0, #42a5f5)',
  },

  // ── SPIRITO ─────────────────────────────────────────────────────

  {
    id: 'mindfulness-giovani',
    title: 'Mindfulness & Benessere Interiore',
    icon: '🧘',
    description: 'Meditazione, respiro consapevole e equilibrio interiore per giovani (8-25)',
    category: 'benessere',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'meditazione', label: 'Meditazione', icon: '🕯️', description: 'Mindfulness, body scan, meditazione guidata, respirazione' },
      { id: 'gestione-stress', label: 'Gestione dello Stress', icon: '🌊', description: 'Tecniche anti-ansia, grounding, rilassamento progressivo' },
      { id: 'sonno', label: 'Igiene del Sonno', icon: '🌙', description: 'Ritmi circadiani, routine serale, qualità del riposo' },
      { id: 'diario', label: 'Journaling & Riflessione', icon: '📓', description: 'Scrittura riflessiva, gratitudine, autoanalisi guidata' },
    ],
    suggestedCustomizations: [
      'Meditazione per ragazzi che non hanno mai provato',
      'Tecniche di respirazione prima degli esami',
      'Come dormire meglio da adolescente con lo smartphone',
      'Mindfulness per atleti e performance mentale',
    ],
    coverColor: 'linear-gradient(135deg, #00695c, #4db6ac)',
  },
  {
    id: 'filosofia-vita',
    title: 'Filosofia di Vita & Scopo',
    icon: '🌟',
    description: 'Valori, scopo, etica e grandi domande per trovare la propria strada (8-25)',
    category: 'filosofia',
    defaultLevel: 'base',
    availableLevels: ['bambino', 'base', 'intermedio', 'avanzato'],
    focuses: [
      { id: 'valori', label: 'Valori & Etica', icon: '⚖️', description: 'Scoprire i propri valori, etica quotidiana, dilemmi morali' },
      { id: 'scopo', label: 'Ikigai & Scopo', icon: '🎯', description: 'Trovare la propria passione, missione, vocazione' },
      { id: 'grandi-domande', label: 'Grandi Domande', icon: '🌌', description: 'Chi sono? Cosa voglio? Qual è il senso? Filosofia accessibile' },
      { id: 'role-models', label: 'Storie Ispiratrici', icon: '🌠', description: 'Vite di persone che hanno cambiato il mondo, lezioni di vita' },
    ],
    suggestedCustomizations: [
      'Filosofia spiegata a un bambino di 10 anni',
      'Come scegliere cosa fare nella vita dopo il liceo',
      'Etica della tecnologia e social media',
      'Stoicismo pratico per la vita quotidiana',
    ],
    coverColor: 'linear-gradient(135deg, #f57f17, #ffcc02)',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Costruisce il topic completo a partire dal template + focus + customizzazione.
 */
export function buildTopicFromTemplate(
  template: CourseTemplate,
  focus: CourseFocus | null,
  _customDirection: CustomDirection | null,
  freeText: string
): string {
  let topic = template.title;

  if (focus) {
    topic += ` — ${focus.label}`;
  }

  // La customizzazione libera viene passata separatamente al generatore
  // ma il topic deve essere descrittivo
  if (freeText.trim()) {
    topic += `: ${freeText.trim()}`;
  }

  return topic;
}

/**
 * Costruisce le istruzioni di customizzazione per il generatore AI.
 */
export function buildCustomizationInstructions(
  _template: CourseTemplate,
  focus: CourseFocus | null,
  customDirection: CustomDirection | null,
  freeText: string
): string {
  const parts: string[] = [];

  if (focus) {
    parts.push(`FOCUS SPECIFICO: ${focus.label} — ${focus.description}`);
  }

  if (customDirection) {
    const dir = CUSTOM_DIRECTIONS.find(d => d.id === customDirection);
    if (dir) {
      parts.push(`DIREZIONE: ${dir.label} — ${dir.hint}`);
    }
  }

  if (freeText.trim()) {
    parts.push(`ISTRUZIONI AGGIUNTIVE DELL'UTENTE: ${freeText.trim()}`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}
