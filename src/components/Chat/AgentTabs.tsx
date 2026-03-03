import { useEffect, useRef } from 'react';
import type { Message } from '../../types/conversation';
import { getAgent } from '../../lib/agents';

interface AgentTabsProps {
  /** Only assistant messages (already filtered, excluding demo/error) */
  validMessages: Message[];
  /** Index of currently active tab */
  activeIndex: number;
  /** Called when user clicks a tab */
  onTabClick: (index: number) => void;
}

/**
 * Horizontal scrollable agent tabs — one tab per valid AI response.
 * Active tab scrolls into view automatically.
 */
export function AgentTabs({ validMessages, activeIndex, onTabClick }: AgentTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  if (validMessages.length === 0) return null;

  return (
    <div className="agent-tabs-bar" ref={containerRef}>
      {validMessages.map((msg, i) => {
        const agent = getAgent(msg.senderName);
        const isActive = i === activeIndex;
        return (
          <button
            key={msg.id}
            ref={isActive ? activeRef : undefined}
            className={`agent-tab ${isActive ? 'active' : ''}`}
            style={{
              '--tab-color': agent?.color || '#888',
              '--tab-glow': agent?.glowColor || 'rgba(136,136,136,0.3)',
            } as React.CSSProperties}
            onClick={() => onTabClick(i)}
            title={`${agent?.name || msg.senderName} — turno ${i + 1}`}
          >
            {agent && (
              <img src={agent.staticImage} alt="" className="agent-tab-avatar" />
            )}
            <span className="agent-tab-name">{agent?.name || msg.senderName}</span>
            <span className="agent-tab-idx">{i + 1}</span>
          </button>
        );
      })}
    </div>
  );
}
