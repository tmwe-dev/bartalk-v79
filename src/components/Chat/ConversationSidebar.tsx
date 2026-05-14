import { useState, useRef, useCallback } from 'react';
import { useConversationContext } from '../../context/ConversationContext';
import { useAuthContext } from '../../context/AuthContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useT } from '../../lib/i18n';
import { formatTime, truncate } from '../../lib/utils';
import { searchAllConversations, type SearchResult } from '../../lib/storage';
import { searchMessages, type DBSearchResult } from '../../lib/supabaseAPI';

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

  const { authState } = useAuthContext();
  const { workspaceId } = useSettingsContext();
  const t = useT();
  const isDBMode = authState === 'authenticated' && !!workspaceId;

  // ── Search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Map<string, { matchCount: number; snippet: string }>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchResults(new Map());
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const resultMap = new Map<string, { matchCount: number; snippet: string }>();

        if (isDBMode && workspaceId) {
          const dbResults: DBSearchResult[] = await searchMessages(workspaceId, query);
          for (const r of dbResults) {
            resultMap.set(r.conversationId, { matchCount: r.matchCount, snippet: r.snippet });
          }
        } else {
          const localResults: SearchResult[] = searchAllConversations(query);
          for (const r of localResults) {
            resultMap.set(r.convId, { matchCount: r.matchCount, snippet: r.snippet });
          }
        }

        setSearchResults(resultMap);
      } catch (err) {
        console.error('[search] Errore ricerca:', err);
        // Fallback a ricerca locale
        const localResults = searchAllConversations(query);
        const resultMap = new Map<string, { matchCount: number; snippet: string }>();
        for (const r of localResults) {
          resultMap.set(r.convId, { matchCount: r.matchCount, snippet: r.snippet });
        }
        setSearchResults(resultMap);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [isDBMode, workspaceId]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(new Map());
    setIsSearching(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  if (!sidebarOpen) return null;

  // ── Filtra e ordina conversazioni ──
  const sorted = [...conversationList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const isSearchActive = searchQuery.trim().length > 0;
  const displayedConversations = isSearchActive
    ? sorted.filter(conv => searchResults.has(conv.id))
    : sorted;

  return (
    <>
      <div className="conv-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <div className="conv-sidebar" role="complementary" aria-label="Cronologia conversazioni">
        <div className="conv-sidebar-header">
          <h3>{t('conversationsTitle')}</h3>
          <div className="conv-sidebar-actions">
            <button className="conv-new-btn" onClick={() => { newConversation(); setSidebarOpen(false); }} aria-label="Nuova conversazione">
              {t('newBtn')}
            </button>
            <button className="conv-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Chiudi sidebar">✕</button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="conv-sidebar-search">
          <span className="conv-search-icon">🔍</span>
          <input
            type="text"
            className="conv-search-input"
            placeholder={t('searchMessages')}
            value={searchQuery}
            onChange={(e) => performSearch(e.target.value)}
            aria-label={t('searchMessages')}
          />
          {searchQuery && (
            <button className="conv-search-clear" onClick={clearSearch} title={t('clearSearch')}>✕</button>
          )}
        </div>

        <div className="conv-sidebar-list">
          {isSearching && (
            <div className="conv-empty">{t('searchInProgress')}</div>
          )}
          {!isSearching && displayedConversations.length === 0 && (
            <div className="conv-empty">
              {isSearchActive ? t('noResults') : t('noConvSaved')}
            </div>
          )}
          {!isSearching && displayedConversations.map(conv => {
            const match = searchResults.get(conv.id);
            return (
              <div
                key={conv.id}
                className={`conv-item ${conv.id === conversationId ? 'active' : ''}`}
                onClick={() => { loadConversation(conv.id); if (isSearchActive) clearSearch(); }}
                tabIndex={0}
                role="button"
                aria-label={`Conversazione: ${conv.title}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadConversation(conv.id); if (isSearchActive) clearSearch(); } }}
              >
                <div className="conv-item-header">
                  <span className="conv-item-title">{conv.title}</span>
                  <div className="conv-item-header-right">
                    {match && (
                      <span className="conv-match-count">{match.matchCount}</span>
                    )}
                    <button
                      className="conv-item-delete"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      title={t('deleteConv')}
                      aria-label={`Elimina conversazione: ${conv.title}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <div className="conv-item-meta">
                  <span>{conv.messageCount} msg</span>
                  <span>{formatTime(conv.updatedAt)}</span>
                </div>
                {match ? (
                  <div className="conv-item-preview conv-item-match">{match.snippet}</div>
                ) : conv.lastMessage ? (
                  <div className="conv-item-preview">{truncate(conv.lastMessage, 60)}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
