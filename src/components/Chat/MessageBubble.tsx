import type { Message } from '../../types/conversation';
import { getAgent } from '../../lib/agents';
import { useSettingsContext } from '../../context/SettingsContext';
import { formatTime } from '../../lib/utils';
import { getAPIKey } from '../../lib/storage';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isHuman = message.senderType === 'human';
  const isSystem = message.senderType === 'system';
  const agent = !isHuman && !isSystem ? getAgent(message.senderName) : undefined;
  const { ttsEnabled } = useSettingsContext();

  const bubbleStyle = agent
    ? { borderLeftColor: agent.color, '--agent-glow': agent.glowColor } as React.CSSProperties
    : {};

  const hasElevenLabs = !!getAPIKey('elevenlabs');

  return (
    <div className={`message ${isHuman ? 'message-human' : isSystem ? 'message-system' : 'message-agent'}`}>
      {agent && (
        <div className="message-avatar">
          <img src={agent.staticImage} alt={agent.name} className="avatar-img" />
          {ttsEnabled && hasElevenLabs && (
            <span className="avatar-elevenlabs-badge" title="Voce ElevenLabs" />
          )}
        </div>
      )}
      <div className="message-body" style={bubbleStyle}>
        <div className="message-header">
          <span className="message-sender" style={agent ? { color: agent.color } : {}}>
            {agent ? `${agent.emoji} ${agent.name}` : isHuman ? 'Tu' : 'Sistema'}
          </span>
          {agent && ttsEnabled && (
            <span className="message-voice-name" title={`Voce: ${agent.defaultVoiceName}`}>
              {agent.defaultVoiceName}
            </span>
          )}
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
