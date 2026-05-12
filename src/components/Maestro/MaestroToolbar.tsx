/**
 * BarTalk v8 — MaestroToolbar Component
 * Quick command toolbar for maestro interactions.
 */

interface MaestroToolbarProps {
  onCommand: (text: string) => void;
  isLanguageCourse: boolean; // show pronunciation button only for language courses
  disabled?: boolean;
}

interface ToolbarCommand {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  languageOnly?: boolean;
}

const TOOLBAR_COMMANDS: ToolbarCommand[] = [
  {
    id: 'repeat',
    icon: '🔄',
    label: 'Ripeti',
    prompt: 'Ripeti l\'ultima spiegazione in modo più semplice',
  },
  {
    id: 'example',
    icon: '💡',
    label: 'Esempio',
    prompt: 'Fammi un esempio pratico',
  },
  {
    id: 'quiz',
    icon: '❓',
    label: 'Quiz',
    prompt: 'Fammi un quiz su quello che abbiamo studiato',
  },
  {
    id: 'simplify',
    icon: '📝',
    label: 'Semplifica',
    prompt: 'Spiega in modo più semplice',
  },
  {
    id: 'pronunciation',
    icon: '🎤',
    label: 'Pronuncia',
    prompt: 'Proponi un esercizio di pronuncia',
    languageOnly: true,
  },
  {
    id: 'progress',
    icon: '📊',
    label: 'Progressi',
    prompt: 'Mostrami i miei progressi',
  },
];

export function MaestroToolbar({ onCommand, isLanguageCourse, disabled }: MaestroToolbarProps) {
  const visibleCommands = TOOLBAR_COMMANDS.filter((cmd) => {
    if (cmd.languageOnly && !isLanguageCourse) {
      return false;
    }
    return true;
  });

  return (
    <div className="maestro-toolbar">
      {visibleCommands.map((cmd) => (
        <button
          key={cmd.id}
          className="maestro-toolbar-btn"
          onClick={() => onCommand(cmd.prompt)}
          disabled={disabled}
          title={cmd.label}
        >
          <span className="maestro-toolbar-btn-icon">{cmd.icon}</span>
          <span className="maestro-toolbar-btn-label">{cmd.label}</span>
        </button>
      ))}
    </div>
  );
}
