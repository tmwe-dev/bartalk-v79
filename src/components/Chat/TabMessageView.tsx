import type { Message } from '../../types/conversation';
import { getAgent } from '../../lib/agents';
import { formatTime } from '../../lib/utils';

interface TabMessageViewProps {
  message: Message | null;
  index: number;
  total: number;
}

/**
 * Single message display for tab mode.
 * Shows the active agent's message full-width, with animated avatar.
 */
export function TabMessageView({ message, index, total }: TabMessageViewProps) {
  if (!message) {
    return (
      <div className="tab-msg-view tab-msg-empty">
        <p>Nessun messaggio da mostrare</p>
      </div>
    );
  }

  const agent = getAgent(message.senderName);
  const isHuman = message.senderType === 'human';

  return (
    <div className="tab-msg-view">
      {/* Agent header with animated avatar */}
      <div className="tab-msg-header">
        {agent && (
          <img
            src={agent.talkGif}
            alt={agent.name}
            className="tab-msg-avatar"
            style={{ filter: `drop-shadow(0 0 16px ${agent.glowColor})` }}
          />
        )}
        <div className="tab-msg-sender-info">
          <span
            className="tab-msg-sender-name"
            style={{ color: agent?.color || 'var(--text-primary)' }}
          >
            {agent ? `${agent.emoji} ${agent.name}` : isHuman ? 'Tu' : message.senderName}
          </span>
          <span className="tab-msg-provider">
            {agent?.provider?.toUpperCase() || ''}
          </span>
          <span className="tab-msg-time">{formatTime(message.createdAt)}</span>
        </div>
        <span className="tab-msg-counter">{index + 1} / {total}</span>
      </div>

      {/* Message content */}
      <div
        className="tab-msg-content"
        style={{ borderLeftColor: agent?.color || 'var(--accent)' }}
      >
        {message.content}
      </div>

      {/* Meta info */}
      {(message.duration !== undefined || message.tokensIn) && (
        <div className="tab-msg-meta">
          {message.duration !== undefined && (
            <span>{(message.duration / 1000).toFixed(1)}s</span>
          )}
          {message.tokensIn && (
            <span>{message.tokensIn + (message.tokensOut || 0)} tok</span>
          )}
        </div>
      )}
    </div>
  );
}
