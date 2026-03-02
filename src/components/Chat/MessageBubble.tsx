import type { Message } from '../../types/conversation';
import { getAgent } from '../../lib/agents';
import { formatTime } from '../../lib/utils';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isHuman = message.senderType === 'human';
  const isSystem = message.senderType === 'system';
  const agent = !isHuman && !isSystem ? getAgent(message.senderName) : undefined;

  const bubbleStyle = agent
    ? { borderLeftColor: agent.color, '--agent-glow': agent.glowColor } as React.CSSProperties
    : {};

  return (
    <div className={`message ${isHuman ? 'message-human' : isSystem ? 'message-system' : 'message-agent'}`}>
      {agent && (
        <div className="message-avatar">
          <img
            src={agent.staticImage}
            alt={agent.name}
            className="avatar-img"
          />
        </div>
      )}
      <div className="message-body" style={bubbleStyle}>
        <div className="message-header">
          <span className="message-sender" style={agent ? { color: agent.color } : {}}>
            {agent ? `${agent.emoji} ${agent.name}` : isHuman ? 'Tu' : 'Sistema'}
          </span>
          <span className="message-time">{formatTime(message.createdAt)}</span>
        </div>
        <div className="message-text">{message.content}</div>
        {message.duration !== undefined && (
          <div className="message-meta">
            {(message.duration / 1000).toFixed(1)}s
            {message.tokensIn ? ` · ${message.tokensIn + (message.tokensOut || 0)} tok` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
