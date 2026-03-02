import { useAgentContext } from '../../context/AgentContext';
import { AgentCard } from './AgentCard';

export function AgentSelector() {
  const { agents } = useAgentContext();

  return (
    <div className="agent-selector">
      <h3 className="sidebar-title">Agenti</h3>
      <div className="agent-list">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
