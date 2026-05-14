/**
 * RadioChat v8 — SectionPage
 * Pagina "pulita" per singola sezione, usata dal MenuPage carousel.
 * Niente tab bar di navigazione tra sezioni — solo Navbar + contenuto + back.
 * La ChatPage originale con tutti i tab resta per l'uso desktop/classico.
 */
import { useState, useCallback, useMemo, lazy, Suspense, useEffect, useRef } from 'react';
import {
  ChatContainer, PodcastMode, FloatingZoomControl,
  AgentStrip, TabMessageView, TaskPanel, CoursePanel,
} from '../components';
import { useUIContext } from '../context/UIContext';
import { useAuthContext } from '../context/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { useEffectiveTier } from '../hooks/useEffectiveTier';
import { isFeatureAvailable, getRequiredTier, tierLabel } from '../lib/featureGating';
import {
  useConversationContext, useSettingsContext, useAgentContext,
} from '../context';
import {
  useT, formatTime, truncate, getAgent,
  generateFullConversationSummary, exportConversationAsMarkdown, buildMemoryBlock,
  resetTTS, stopTTS, enqueueTTS,
} from '../lib';
import type { Message } from '../types/conversation';

const RadioCarousel3D = lazy(() =>
  import('../components/Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

const FreeVoiceTab = lazy(() =>
  import('../components/FreeVoice/FreeVoiceTab')
);

const LifeTutorTab = lazy(() =>
  import('../components/LifeTutor/LifeTutorTab').then(m => ({ default: m.LifeTutorTab }))
);

const MAX_SLOTS = 8;

function getVisibleSlice(messages: Message[]) {
  return messages
    .filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError)
    .slice(-MAX_SLOTS);
}

function getValidAgentMessages(messages: Message[]) {
  return messages.filter(m => m.senderType === 'assistant' && !m.isDemo && !m.isError);
}

// ── Sidebar compatta con cerca + export ──
function SectionSidebar({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle: () => void; onClose: () => void }) {
  const {
    conversationId, conversationTitle, messages, conversationList, loadConversation,
    deleteConversation, newConversation,
  } = useConversationContext();
  const { agents, toggleAgent, isAgentEnabled } = useAgentContext();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [expandedConvTools, setExpandedConvTools] = useState<string | null>(null);

  // Memory stats
  const memoryStats = messages.length > 0
    ? buildMemoryBlock(messages, conversationId).stats
    : null;

  const handleSummary = async () => {
    setSummaryLoading(true);
    setSummaryText('');
    const result = await generateFullConversationSummary(messages);
    setSummaryText(result || t('summaryError'));
    setSummaryLoading(false);
  };

  const handleExport = () => {
    const md = exportConversationAsMarkdown(messages, conversationTitle);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radiochat-${conversationTitle.substring(0, 30).replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Ordina conversazioni per data
  const sorted = [...conversationList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Filtra per ricerca (titolo, ultimo messaggio)
  const filtered = searchQuery.trim()
    ? sorted.filter(conv => {
        const q = searchQuery.toLowerCase();
        return (
          conv.title.toLowerCase().includes(q) ||
          (conv.lastMessage && conv.lastMessage.toLowerCase().includes(q))
        );
      })
    : sorted;

  if (collapsed) return null;

  return (
    <aside className="left-sidebar">
      {/* Brand */}
      <div className="lsb-header">
        <span className="lsb-brand">📻 RadioChat</span>
        <button className="lsb-collapse-btn" onClick={onToggle} title={t('closeSidebar')}>✕</button>
      </div>

      {/* New Chat */}
      <button className="lsb-new-chat" onClick={() => { resetTTS(); newConversation(); onClose(); }}>
        <span>＋</span> {t('newConversation')}
      </button>

      {/* Campo ricerca */}
      <div className="lsb-search">
        <input
          type="text"
          className="lsb-search-input"
          placeholder={t('searchConversations') || 'Cerca nelle conversazioni...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="lsb-search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Conversations */}
      <div className="lsb-section">
        <div className="lsb-section-title">
          {t('conversations')}
          {searchQuery && <span className="lsb-search-count"> ({filtered.length})</span>}
        </div>
        <div className="lsb-conv-list">
          {filtered.length === 0 && (
            <div className="lsb-empty">
              {searchQuery ? (t('noSearchResults') || 'Nessun risultato') : t('noConversations')}
            </div>
          )}
          {filtered.map(conv => (
            <div key={conv.id}>
              <div
                className={`lsb-conv-item ${conv.id === conversationId ? 'active' : ''}`}
                onClick={() => { loadConversation(conv.id); onClose(); }}
              >
                <div className="lsb-conv-header">
                  <span className="lsb-conv-title">{conv.title}</span>
                  <div className="lsb-conv-actions">
                    <button
                      className="lsb-conv-action-btn"
                      onClick={(e) => { e.stopPropagation(); setExpandedConvTools(expandedConvTools === conv.id ? null : conv.id); }}
                      title="Strumenti"
                    >⋯</button>
                    <button
                      className="lsb-conv-delete"
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      title={t('delete')}
                    >🗑</button>
                  </div>
                </div>
                <div className="lsb-conv-meta">
                  <span>{conv.messageCount} msg</span>
                  <span>{formatTime(conv.updatedAt)}</span>
                </div>
                {conv.lastMessage && (
                  <div className="lsb-conv-preview">{truncate(conv.lastMessage, 50)}</div>
                )}
              </div>
              {/* Tools espansi per conversazione */}
              {expandedConvTools === conv.id && conv.id === conversationId && (
                <div className="lsb-conv-tools">
                  <button className="lsb-conv-tool-btn" onClick={handleExport}>
                    📥 Esporta Chat
                  </button>
                  <button className="lsb-conv-tool-btn" onClick={handleSummary} disabled={summaryLoading}>
                    {summaryLoading ? '⏳ Generando...' : '📝 Riassunto AI'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div className="lsb-section">
        <div className="lsb-section-title">{t('agents')}</div>
        <div className="lsb-agent-list">
          {agents.map(agent => {
            const enabled = isAgentEnabled(agent.id);
            return (
              <div
                key={agent.id}
                className={`lsb-agent ${enabled ? 'enabled' : 'disabled'}`}
                style={{ '--agent-color': agent.color, '--agent-glow': agent.glowColor } as React.CSSProperties}
                onClick={() => { toggleAgent(agent.id); onClose(); }}
              >
                <img src={agent.staticImage} alt={agent.name} className="lsb-agent-avatar" />
                <div className="lsb-agent-info">
                  <span className="lsb-agent-name">{agent.name}</span>
                  <span className="lsb-agent-provider">{agent.provider}</span>
                </div>
                <div className={`lsb-agent-toggle ${enabled ? 'on' : 'off'}`}>
                  {enabled ? '✓' : '✕'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Memory Stats */}
      {memoryStats && memoryStats.totalMessages > 0 && (
        <div className="lsb-section lsb-memory">
          <div className="lsb-section-title">{t('memoryTitle')}</div>
          <div className="lsb-memory-stats">
            <div className="lsb-memory-row">
              <span className="lsb-memory-dot lsb-dot-l1" />
              <span>{t('memoryFull')}: {memoryStats.level1Count} msg</span>
            </div>
            <div className="lsb-memory-row">
              <span className="lsb-memory-dot lsb-dot-l2" />
              <span>{t('memoryCondensed')}: {memoryStats.level2Count} msg</span>
            </div>
            {memoryStats.level3Summarized > 0 && (
              <div className="lsb-memory-row">
                <span className="lsb-memory-dot lsb-dot-l3" />
                <span>{t('memorySummary')}: {memoryStats.level3Summarized} msg</span>
              </div>
            )}
            <div className="lsb-memory-row lsb-memory-tokens">
              ~{memoryStats.estimatedTokens.toLocaleString()} {t('memoryTokens')}
            </div>
          </div>
        </div>
      )}

      {/* Export globale / Summary */}
      {messages.length > 2 && (
        <div className="lsb-section lsb-export">
          <div className="lsb-section-title">{t('tools')}</div>
          <button className="lsb-tool-btn" onClick={handleSummary} disabled={summaryLoading}>
            {summaryLoading ? `⏳ ${t('generating')}` : `📝 ${t('aiSummary')}`}
          </button>
          <button className="lsb-tool-btn" onClick={handleExport}>
            📥 {t('exportMarkdown')}
          </button>
        </div>
      )}

      {/* Summary result */}
      {summaryText && (
        <div className="lsb-summary-result">
          <div className="lsb-summary-header">
            <span>{t('summaryHeader')}</span>
            <button className="lsb-summary-close" onClick={() => setSummaryText('')}>✕</button>
          </div>
          <div className="lsb-summary-text">{summaryText}</div>
          <button
            className="lsb-tool-btn"
            onClick={() => { navigator.clipboard.writeText(summaryText); }}
          >
            📋 {t('copy')}
          </button>
        </div>
      )}
    </aside>
  );
}

// ── Props ──
interface SectionPageProps {
  sectionId: string;
  onBackToMenu: () => void;
  onSwitchToFull?: () => void;
}

export function SectionPage({ sectionId, onBackToMenu, onSwitchToFull }: SectionPageProps) {
  const { messages } = useConversationContext();
  const { ttsEnabled } = useSettingsContext();
  const { getVoiceId } = useAgentContext();
  const t = useT();

  // ── Feature gating: controlla accesso alla sezione ──
  const { tier } = useEffectiveTier();
  const { addToast } = useUIContext();

  useEffect(() => {
    if (!isFeatureAvailable(sectionId, tier)) {
      addToast(`Passa a ${tierLabel(getRequiredTier(sectionId))} per accedere a questa sezione`, 'info');
      onBackToMenu();
    }
  }, [sectionId, tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sidebar: SEMPRE chiusa di default — si apre solo su richiesta
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const toggleSidebar = useCallback(() => { setSidebarCollapsed(prev => !prev); }, []);

  // ── Valid agent messages ──
  const validAgentMsgs = useMemo(() => getValidAgentMessages(messages), [messages]);

  // ── Agent tab index ──
  const [agentTabIndex, setAgentTabIndex] = useState(0);

  // ── Carousel state ──
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_voffset');
    return saved ? parseInt(saved) : 0;
  });

  const prevMsgCountRef = useRef(0);
  const ttsPlayingIndexRef = useRef(-1);

  // Refs per closures fresche
  const validAgentMsgsRef = useRef(validAgentMsgs);
  const messagesRef = useRef(messages);
  const agentTabIndexRef = useRef(agentTabIndex);
  const carouselIndexRef = useRef(carouselIndex);
  useEffect(() => { validAgentMsgsRef.current = validAgentMsgs; }, [validAgentMsgs]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { agentTabIndexRef.current = agentTabIndex; }, [agentTabIndex]);
  useEffect(() => { carouselIndexRef.current = carouselIndex; }, [carouselIndex]);

  // Persist carousel settings
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_zoom', String(carouselZoom));
  }, [carouselZoom]);
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_voffset', String(carouselVerticalOffset));
  }, [carouselVerticalOffset]);

  // ── Sync: tab + carousel a un messaggio ──
  const syncBothToMessage = useCallback((msg: Message) => {
    const tabIdx = validAgentMsgsRef.current.findIndex(m => m.id === msg.id);
    if (tabIdx >= 0) setAgentTabIndex(tabIdx);
    const cIdx = getVisibleSlice(messagesRef.current).findIndex(m => m.id === msg.id);
    if (cIdx >= 0) setCarouselIndex(cIdx);
  }, []);

  // ── Nuovo messaggio ──
  useEffect(() => {
    const count = validAgentMsgs.length;
    if (count > prevMsgCountRef.current && count > 0) {
      if (prevMsgCountRef.current === 0) {
        ttsPlayingIndexRef.current = -1;
        queueMicrotask(() => {
          setAgentTabIndex(0);
          const slice = getVisibleSlice(messages);
          if (slice.length > 0) setCarouselIndex(0);
        });
      }
    }
    prevMsgCountRef.current = count;
  }, [validAgentMsgs, messages]);

  // ── TTS SYNC ──
  useEffect(() => {
    const onAudioStart = () => {
      ttsPlayingIndexRef.current++;
      const idx = ttsPlayingIndexRef.current;
      const agentMsgs = validAgentMsgsRef.current;
      if (idx >= 0 && idx < agentMsgs.length) {
        syncBothToMessage(agentMsgs[idx]);
      }
    };
    const onAudioStop = () => { ttsPlayingIndexRef.current = -1; };

    window.addEventListener('radio-audio-start', onAudioStart);
    window.addEventListener('radio-audio-stop', onAudioStop);
    return () => {
      window.removeEventListener('radio-audio-start', onAudioStart);
      window.removeEventListener('radio-audio-stop', onAudioStop);
    };
  }, [syncBothToMessage]);

  // ── Click agent tab → sync + play ──
  const onAgentTabClick = useCallback((idx: number) => {
    const msg = validAgentMsgsRef.current[idx];
    if (!msg) { setAgentTabIndex(idx); return; }
    syncBothToMessage(msg);
    if (ttsEnabled) {
      stopTTS();
      setTimeout(() => {
        const agent = getAgent(msg.senderName);
        if (agent) {
          const voiceId = getVoiceId(agent.id);
          ttsPlayingIndexRef.current = idx - 1;
          enqueueTTS({ text: msg.content, voiceId, agentName: msg.senderName });
          const remaining = validAgentMsgsRef.current.slice(idx + 1);
          for (const nextMsg of remaining) {
            const nextAgent = getAgent(nextMsg.senderName);
            if (nextAgent) {
              enqueueTTS({ text: nextMsg.content, voiceId: getVoiceId(nextAgent.id), agentName: nextMsg.senderName });
            }
          }
        }
      }, 100);
    }
  }, [syncBothToMessage, ttsEnabled, getVoiceId]);

  // ── Carousel index change → sync + play ──
  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
    const slice = getVisibleSlice(messagesRef.current);
    const msg = slice[idx];
    if (msg && msg.senderType === 'assistant') {
      const tabIdx = validAgentMsgsRef.current.findIndex(m => m.id === msg.id);
      if (tabIdx >= 0) {
        setAgentTabIndex(tabIdx);
        if (ttsEnabled) {
          stopTTS();
          setTimeout(() => {
            const agent = getAgent(msg.senderName);
            if (agent) {
              const voiceId = getVoiceId(agent.id);
              ttsPlayingIndexRef.current = tabIdx - 1;
              enqueueTTS({ text: msg.content, voiceId, agentName: msg.senderName });
              const remaining = validAgentMsgsRef.current.slice(tabIdx + 1);
              for (const nextMsg of remaining) {
                const nextAgent = getAgent(nextMsg.senderName);
                if (nextAgent) {
                  enqueueTTS({ text: nextMsg.content, voiceId: getVoiceId(nextAgent.id), agentName: nextMsg.senderName });
                }
              }
            }
          }, 100);
        }
      }
    }
  }, [ttsEnabled, getVoiceId]);

  // ── UI context per settings ──
  const { toggleSettings } = useUIContext();
  const { ttsEnabled: ttsOn, setTtsEnabled, webResourcesEnabled, setWebResourcesEnabled,
    lifeTutorEnabled, setLifeTutorEnabled } = useSettingsContext();
  const { user, authState, isSkipMode, signOut, resumeAuth } = useAuthContext();
  const { stop: stopTTSHook, skip: skipTTS, togglePlayPause, isPlaying, isPaused, currentAgent } = useTTS();

  // ── Sezione ha agenti? (chat/carousel usano agentStrip) ──
  const hasAgentStrip = (sectionId === 'chat' || sectionId === 'carousel');

  // ── Render section content ──
  const renderContent = () => {
    switch (sectionId) {
      case 'chat':
        return validAgentMsgs.length > 0 ? (
          <>
            <TabMessageView
              message={validAgentMsgs[agentTabIndex] || null}
              index={agentTabIndex}
              total={validAgentMsgs.length}
            />
          </>
        ) : (
          <ChatContainer />
        );

      case 'carousel':
        return (
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Suspense fallback={<div className="loading-fallback">{t('loadingCarousel')}</div>}>
              <RadioCarousel3D
                messages={messages}
                currentIndex={carouselIndex}
                onIndexChange={onCarouselIndexChange}
                zoom={carouselZoom}
                verticalOffset={carouselVerticalOffset}
              />
            </Suspense>
            <FloatingZoomControl
              zoom={carouselZoom}
              onZoomChange={setCarouselZoom}
              verticalOffset={carouselVerticalOffset}
              onVerticalOffsetChange={setCarouselVerticalOffset}
            />
          </div>
        );

      case 'podcast':
        return <div className="tab-content-padded"><PodcastMode /></div>;

      case 'tasks':
        return <div className="tab-content-padded"><TaskPanel /></div>;

      case 'courses':
        return <div className="tab-content-padded"><CoursePanel /></div>;

      case 'freevoice':
        return (
          <div className="tab-content-padded">
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Caricamento...</div>}>
              <FreeVoiceTab />
            </Suspense>
          </div>
        );

      case 'lifetutor':
        return (
          <div className="tab-content-padded">
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Caricamento Life Tutor...</div>}>
              <LifeTutorTab />
            </Suspense>
          </div>
        );

      default:
        return <div className="tab-content-padded"><p>Sezione non trovata</p></div>;
    }
  };

  return (
    <div className="section-page">
      {/* Mobile overlay per sidebar */}
      {!sidebarCollapsed && window.innerWidth < 768 && (
        <div className="lsb-overlay" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Sidebar — default chiusa */}
      <SectionSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onClose={() => setSidebarCollapsed(true)}
      />

      {/* ── Mini top bar — solo icone essenziali, nessun titolo ── */}
      <div className="section-topbar">
        <div className="section-topbar__left">
          <button className="section-topbar__btn" onClick={onBackToMenu} title="Menu">←</button>
          <button className="section-topbar__btn" onClick={toggleSidebar} title="Sidebar">☰</button>
        </div>

        {/* Audio controls inline */}
        {ttsOn && (isPlaying || isPaused) && (
          <div className="section-topbar__audio">
            {currentAgent && <span className="section-topbar__agent">{currentAgent}</span>}
            <button className="section-topbar__btn" onClick={togglePlayPause}>{isPaused ? '▶️' : '⏸️'}</button>
            <button className="section-topbar__btn" onClick={skipTTS}>⏭️</button>
            <button className="section-topbar__btn" onClick={stopTTSHook}>⏹️</button>
          </div>
        )}

        <div className="section-topbar__right">
          {onSwitchToFull && (
            <button className="section-topbar__expand-full" onClick={onSwitchToFull} title="Vista completa">
              ⛶ Full
            </button>
          )}
          <button className={`section-topbar__btn ${webResourcesEnabled ? 'active' : ''}`}
            onClick={() => setWebResourcesEnabled(!webResourcesEnabled)} title="Web">🌐</button>
          <button className={`section-topbar__btn ${lifeTutorEnabled ? 'active' : ''}`}
            onClick={() => setLifeTutorEnabled(!lifeTutorEnabled)} title="Life Tutor">🎓</button>
          <button className={`section-topbar__btn ${ttsOn ? 'active' : ''}`}
            onClick={() => setTtsEnabled(!ttsOn)} title="Audio">{ttsOn ? '🔊' : '🔇'}</button>
          <button className="section-topbar__btn" onClick={toggleSettings} title="Settings">⚙️</button>
          {authState === 'authenticated' && user ? (
            <button className="section-topbar__btn" onClick={signOut} title={user.email}>👤</button>
          ) : isSkipMode ? (
            <button className="section-topbar__btn" onClick={resumeAuth} title="Accedi">🔐</button>
          ) : null}
        </div>
      </div>

      {/* ── Area principale: contenuto + AgentStrip a destra ── */}
      <div className="section-body">
        {/* Contenuto sezione */}
        <div className="section-content">
          {renderContent()}
        </div>

        {/* AgentStrip: GIF agenti sulla destra (solo chat/carousel) */}
        {hasAgentStrip && validAgentMsgs.length > 0 && (
          <AgentStrip
            validMessages={validAgentMsgs}
            activeIndex={agentTabIndex}
            onSelect={onAgentTabClick}
          />
        )}
      </div>

      {/* InputBox già incluso dentro ChatContainer — non duplicare */}
    </div>
  );
}

export default SectionPage;
