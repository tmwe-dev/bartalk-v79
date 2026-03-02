import type { AgentConfig } from '../../types/agents';
import { useAgentContext } from '../../context/AgentContext';

interface AgentCardProps {
  agent: AgentConfig;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { isAgentEnabled, toggleAgent } = useAgentContext();
  const enabled = isAgentEnabled(agent.id);

  return (
    <div
      className={`agent-card ${enabled ? 'agent-enabled' : 'agent-disabled'}`}
      onClick={() => toggleAgent(agent.id)}
      style={{
        borderColor: enabled ? agent.color : 'transparent',
        '--agent-color': agent.color,
        '--agent-glow': agent.glowColor,
      } as React.CSSProperties}
    >
      <img
        src={agent.staticImage}
        alt={agent.name}
        className="agent-card-avatar"
      />
      <div className="agent-card-info">
        <span className="agent-card-name">
          {agent.emoji} {agent.name}
        </span>
        <span className="agent-card-provider">{agent.provider}</span>
      </div>
      <div className={`agent-toggle ${enabled ? 'on' : 'off'}`}>
        {enabled ? '✓' : '✕'}
      </div>
    </div>
  );
}
