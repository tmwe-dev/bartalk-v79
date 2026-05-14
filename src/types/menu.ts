/**
 * RadioChat v8 — Menu item types and configuration
 */

export interface MenuItemGradient {
  from: string;
  to: string;
  border: string;
}

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: MenuItemGradient;
  accentColor: string;
  /** Chiave per feature gating (corrisponde a TIER_FEATURES in featureGating.ts) */
  featureKey: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'chat',
    title: 'Chat',
    description: 'Conversa con Albert, Archimede, Pitagora e Newton',
    icon: '💬',
    featureKey: 'chat',
    gradient: {
      from: 'rgba(59, 130, 246, 0.18)',
      to: 'rgba(37, 99, 235, 0.06)',
      border: 'rgba(59, 130, 246, 0.4)',
    },
    accentColor: '#60a5fa',
  },
  {
    id: 'podcast',
    title: 'Podcast',
    description: 'Ascolta dibattiti tra agenti AI su qualsiasi argomento',
    icon: '🎙️',
    featureKey: 'podcast',
    gradient: {
      from: 'rgba(168, 85, 247, 0.18)',
      to: 'rgba(147, 51, 234, 0.06)',
      border: 'rgba(168, 85, 247, 0.4)',
    },
    accentColor: '#c084fc',
  },
  {
    id: 'courses',
    title: 'Percorsi',
    description: 'Corsi strutturati con maestri personalizzati',
    icon: '📚',
    featureKey: 'courses',
    gradient: {
      from: 'rgba(6, 182, 212, 0.18)',
      to: 'rgba(8, 145, 178, 0.06)',
      border: 'rgba(6, 182, 212, 0.4)',
    },
    accentColor: '#22d3ee',
  },
  {
    id: 'tasks',
    title: 'Task',
    description: 'Obiettivi e compiti da completare con gli agenti',
    icon: '🎯',
    featureKey: 'tasks',
    gradient: {
      from: 'rgba(245, 158, 11, 0.18)',
      to: 'rgba(217, 119, 6, 0.06)',
      border: 'rgba(245, 158, 11, 0.4)',
    },
    accentColor: '#fbbf24',
  },
  {
    id: 'freevoice',
    title: 'Voice',
    description: 'Parla liberamente con il tuo mentore vocale',
    icon: '🗣️',
    featureKey: 'freevoice',
    gradient: {
      from: 'rgba(244, 63, 94, 0.18)',
      to: 'rgba(225, 29, 72, 0.06)',
      border: 'rgba(244, 63, 94, 0.4)',
    },
    accentColor: '#fb7185',
  },
  {
    id: 'lifetutor',
    title: 'Life Tutor',
    description: 'Un compagno di viaggio per la crescita personale',
    icon: '🎓',
    featureKey: 'lifetutor',
    gradient: {
      from: 'rgba(34, 197, 94, 0.18)',
      to: 'rgba(22, 163, 74, 0.06)',
      border: 'rgba(34, 197, 94, 0.4)',
    },
    accentColor: '#4ade80',
  },
  {
    id: 'carousel',
    title: 'Carousel',
    description: 'Esplora i messaggi in una galleria 3D immersiva',
    icon: '🎠',
    featureKey: 'carousel',
    gradient: {
      from: 'rgba(99, 102, 241, 0.18)',
      to: 'rgba(79, 70, 229, 0.06)',
      border: 'rgba(99, 102, 241, 0.4)',
    },
    accentColor: '#818cf8',
  },
  {
    id: 'maestro',
    title: 'Maestro',
    description: 'Orchestrazione avanzata multi-agente con voce personalizzata',
    icon: '🎓',
    featureKey: 'maestro',
    gradient: {
      from: 'rgba(251, 146, 60, 0.18)',
      to: 'rgba(234, 88, 12, 0.06)',
      border: 'rgba(251, 146, 60, 0.4)',
    },
    accentColor: '#fb923c',
  },
  {
    id: 'progress',
    title: 'Progressi',
    description: 'Dashboard dei tuoi progressi di apprendimento',
    icon: '📊',
    featureKey: 'progress',
    gradient: {
      from: 'rgba(16, 185, 129, 0.18)',
      to: 'rgba(5, 150, 105, 0.06)',
      border: 'rgba(16, 185, 129, 0.4)',
    },
    accentColor: '#34d399',
  },
];
