/**
 * RadioChat v8 — AgentStrip
 * Colonna verticale destra con GIF/avatar degli agenti.
 * Ogni GIF corrisponde a un messaggio agente — click seleziona quel messaggio.
 * Scrollabile, limitata tra header e input box.
 */
import { useRef, useEffect } from 'react';
import { getAgent } from '../../lib';
import type { Message } from '../../types/conversation';

interface AgentStripProps {
  validMessages: Message[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function AgentStrip({ validMessages, activeIndex, onSelect }: AgentStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll per mantenere l'avatar attivo visibile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.children[activeIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  if (validMessages.length === 0) return null;

  return (
    <div className="agent-strip">
      <div className="agent-strip__scroll" ref={scrollRef}>
        {validMessages.map((msg, i) => {
          const agent = getAgent(msg.senderName);
          if (!agent) return null;
          const isActive = i === activeIndex;

          return (
            <button
              key={`${msg.id}-${i}`}
              className={`agent-strip__item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(i)}
              title={`${agent.name} — msg ${i + 1}`}
              style={{
                '--agent-color': agent.color,
                '--agent-glow': agent.glowColor,
              } as React.CSSProperties}
            >
              <img
                src={isActive ? agent.talkGif : agent.staticImage}
                alt={agent.name}
                className="agent-strip__avatar"
              />
              <span className="agent-strip__index">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
