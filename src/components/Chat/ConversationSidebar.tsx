import { useConversationContext } from '../../context/ConversationContext';
import { formatTime, truncate } from '../../lib/utils';

export function ConversationSidebar() {
  const {
    conversationId,
    conversationList,
    sidebarOpen,
    setSidebarOpen,
    loadConversation,
    deleteConversation,
    newConversation,
  } = useConversationContext();

  if (!sidebarOpen) return null;

  const sorted = [...conversationList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      {/* Overlay */}
      <div className="conv-sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <div className="conv-sidebar">
        <div className="conv-sidebar-header">
          <h3>Conversazioni</h3>
          <div className="conv-sidebar-actions">
            <button className="conv-new-btn" onClick={() => { newConversation(); setSidebarOpen(false); }}>
              ➕ Nuova
            </button>
            <button className="conv-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
          </div>
        </div>

        <div className="conv-sidebar-list">
          {sorted.length === 0 && (
            <div className="conv-empty">Nessuna conversazione salvata</div>
          )}
          {sorted.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${conv.id === conversationId ? 'active' : ''}`}
              onClick={() => loadConversation(conv.id)}
            >
              <div className="conv-item-header">
                <span className="conv-item-title">{conv.title}</span>
                <button
                  className="conv-item-delete"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  title="Elimina"
                >
                  🗑
                </button>
              </div>
              <div className="conv-item-meta">
                <span>{conv.messageCount} msg</span>
                <span>{formatTime(conv.updatedAt)}</span>
              </div>
              {conv.lastMessage && (
                <div className="conv-item-preview">{truncate(conv.lastMessage, 60)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
