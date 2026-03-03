import { useState, useCallback, useMemo, lazy, Suspense, useEffect, useRef } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { ChatContainer } from '../components/Chat/ChatContainer';
import { InputBox } from '../components/Chat/InputBox';
import { PodcastMode } from '../components/Podcast/PodcastMode';
import { FloatingZoomControl } from '../components/Carousel/FloatingZoomControl';
import { AudioControlBar } from '../components/Chat/AudioControlBar';
import { AgentTabs } from '../components/Chat/AgentTabs';
import { TabMessageView } from '../components/Chat/TabMessageView';
import { TaskPanel } from '../components/Tasks/TaskPanel';
import { useConversationContext } from '../context/ConversationContext';
import { useSettingsContext } from '../context/SettingsContext';
import { useAgentContext } from '../context/AgentContext';
import { useTaskContext } from '../context/TaskContext';
import { formatTime, truncate } from '../lib/utils';
import {
  generateFullConversationSummary,
  exportConversationAsMarkdown,
  buildMemoryBlock,
} from '../lib/memory';
import { resetTTS } from '../lib/tts';
import { StudioPage } from '../components/Studio/StudioPage';
import type { Message } from '../types/conversation';

const RadioCarousel3D = lazy(() =>
  import('../components/Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

type MainTab = 'chat' | 'carousel' | 'podcast' | 'tasks' | 'studio';
const MAX_SLOTS = 8;

/** Carousel visible slice: human + valid assistant messages (no demo/error) */
function getVisibleSlice(messages: Message[]) {
  return messages
    .filter(m => (m.senderType === 'assistant' || m.senderType === 'human') && !m.isDemo && !m.isError)
    .slice(-MAX_SLOTS);
}

/** Agent tabs: only valid assistant messages (no demo/error) */
function getValidAgentMessages(messages: Message[]) {
  return messages.filter(m => m.senderType === 'assistant' && !m.isDemo && !m.isError);
}

// ── Left Sidebar (permanente, stile v7.x) ────────────────────────────
function LeftSidebar({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle: () => void; onClose: () => void }) {
  const {
    conversationId, conversationTitle, messages, conversationList, loadConversation,
    deleteConversation, newConversation,
  } = useConversationContext();
  const { agents, toggleAgent, isAgentEnabled } = useAgentContext();
  const { ttsEnabled, setTtsEnabled } = useSettingsContext();
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // Memory stats
  const memoryStats = messages.length > 0
    ? buildMemoryBlock(messages, conversationId).stats
    : null;

  const handleSummary = async () => {
    setSummaryLoading(true);
    setSummaryText('');
    const result = await generateFullConversationSummary(messages);
    setSummaryText(result || 'Impossibile generare il riassunto. Verifica le chiavi API.');
    setSummaryLoading(false);
  };

  const handleExport = () => {
    const md = exportConversationAsMarkdown(messages, conversationTitle);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bartalk-${conversationTitle.substring(0, 30).replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...conversationList].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (collapsed) return null;

  return (
    <aside className="left-sidebar">
      {/* Brand */}
      <div className="lsb-header">
        <span className="lsb-brand">📻 BarTalk</span>
        <button className="lsb-collapse-btn" onClick={onToggle} title="Chiudi sidebar">✕</button>
      </div>

      {/* New Chat */}
      <button className="lsb-new-chat" onClick={() => { resetTTS(); newConversation(); onClose(); }}>
        <span>＋</span> Nuova conversazione
      </button>

      {/* Conversations */}
      <div className="lsb-section">
        <div className="lsb-section-title">Conversazioni</div>
        <div className="lsb-conv-list">
          {sorted.length === 0 && (
            <div className="lsb-empty">Nessuna conversazione</div>
          )}
          {sorted.map(conv => (
            <div
              key={conv.id}
              className={`lsb-conv-item ${conv.id === conversationId ? 'active' : ''}`}
              onClick={() => { loadConversation(conv.id); onClose(); }}
            >
              <div className="lsb-conv-header">
                <span className="lsb-conv-title">{conv.title}</span>
                <button
                  className="lsb-conv-delete"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  title="Elimina"
                >🗑</button>
              </div>
              <div className="lsb-conv-meta">
                <span>{conv.messageCount} msg</span>
                <span>{formatTime(conv.updatedAt)}</span>
              </div>
              {conv.lastMessage && (
                <div className="lsb-conv-preview">{truncate(conv.lastMessage, 50)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div className="lsb-section">
        <div className="lsb-section-title">Agenti</div>
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
                <img
                  src={agent.staticImage}
                  alt={agent.name}
                  className="lsb-agent-avatar"
                />
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

      {/* Quick Controls */}
      <div className="lsb-controls">
        <label className="lsb-control-row" onClick={() => { setTtsEnabled(!ttsEnabled); onClose(); }}>
          <span className="lsb-control-icon">{ttsEnabled ? '🔊' : '🔇'}</span>
          <span className="lsb-control-label">Audio TTS</span>
          <span className={`lsb-toggle-pill ${ttsEnabled ? 'on' : 'off'}`}>
            <span className="lsb-toggle-knob" />
          </span>
        </label>
      </div>

      {/* Memory Stats */}
      {memoryStats && memoryStats.totalMessages > 0 && (
        <div className="lsb-section lsb-memory">
          <div className="lsb-section-title">Memoria</div>
          <div className="lsb-memory-stats">
            <div className="lsb-memory-row">
              <span className="lsb-memory-dot lsb-dot-l1" />
              <span>Full: {memoryStats.level1Count} msg</span>
            </div>
            <div className="lsb-memory-row">
              <span className="lsb-memory-dot lsb-dot-l2" />
              <span>Condensato: {memoryStats.level2Count} msg</span>
            </div>
            {memoryStats.level3Summarized > 0 && (
              <div className="lsb-memory-row">
                <span className="lsb-memory-dot lsb-dot-l3" />
                <span>Riassunto: {memoryStats.level3Summarized} msg</span>
              </div>
            )}
            <div className="lsb-memory-row lsb-memory-tokens">
              ~{memoryStats.estimatedTokens.toLocaleString()} token stimati
            </div>
          </div>
        </div>
      )}

      {/* Export / Summary */}
      {messages.length > 2 && (
        <div className="lsb-section lsb-export">
          <div className="lsb-section-title">Strumenti</div>
          <button className="lsb-tool-btn" onClick={handleSummary} disabled={summaryLoading}>
            {summaryLoading ? '⏳ Generando...' : '📝 Riassunto AI'}
          </button>
          <button className="lsb-tool-btn" onClick={handleExport}>
            📥 Esporta Markdown
          </button>
        </div>
      )}

      {/* Summary result */}
      {summaryText && (
        <div className="lsb-summary-result">
          <div className="lsb-summary-header">
            <span>Riassunto</span>
            <button className="lsb-summary-close" onClick={() => setSummaryText('')}>✕</button>
          </div>
          <div className="lsb-summary-text">{summaryText}</div>
          <button
            className="lsb-tool-btn"
            onClick={() => {
              navigator.clipboard.writeText(summaryText);
            }}
          >
            📋 Copia
          </button>
        </div>
      )}
    </aside>
  );
}

// ── ChatPage ──────────────────────────────────────────────────────────
export function ChatPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const { messages } = useConversationContext();
  const { ttsEnabled, autoRun, setAutoRun } = useSettingsContext();
  const { activeTask } = useTaskContext();

  // Sidebar: open by default on desktop, closed on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return window.innerWidth < 768;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // ── Valid agent messages (no demo/error) ──
  const validAgentMsgs = useMemo(() => getValidAgentMessages(messages), [messages]);

  // ── Agent tab index (synced with carousel) ──
  const [agentTabIndex, setAgentTabIndex] = useState(0);

  // ── Carousel state ──
  const [carouselIndex, setCarouselIndex] = useState(() => {
    const slice = getVisibleSlice(messages);
    return Math.max(0, slice.length - 1);
  });

  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_voffset');
    return saved ? parseInt(saved) : 0;
  });

  const prevMsgCountRef = useRef(0);

  // Persist carousel settings
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_zoom', String(carouselZoom));
  }, [carouselZoom]);
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_voffset', String(carouselVerticalOffset));
  }, [carouselVerticalOffset]);

  // ── Sync: new agent messages → jump to last tab + last carousel card ──
  useEffect(() => {
    const count = validAgentMsgs.length;
    if (count > prevMsgCountRef.current && count > 0) {
      setAgentTabIndex(count - 1);
      // Also update carousel
      const slice = getVisibleSlice(messages);
      if (slice.length > 0) setCarouselIndex(slice.length - 1);
    }
    prevMsgCountRef.current = count;
  }, [validAgentMsgs, messages]);

  // Tab switch → sync carousel to current agent tab (maintain state across views)
  useEffect(() => {
    if (activeTab === 'carousel') {
      // Sync carousel card to the agent tab that was active
      const msg = validAgentMsgs[agentTabIndex];
      if (msg) {
        const slice = getVisibleSlice(messages);
        const cIdx = slice.findIndex(m => m.id === msg.id);
        if (cIdx >= 0) setCarouselIndex(cIdx);
        else if (slice.length > 0) setCarouselIndex(slice.length - 1);
      }
    }
    if (activeTab === 'chat') {
      // Sync agent tab to the carousel card that was active
      const slice = getVisibleSlice(messages);
      const msg = slice[carouselIndex];
      if (msg && msg.senderType === 'assistant') {
        const tabIdx = validAgentMsgs.findIndex(m => m.id === msg.id);
        if (tabIdx >= 0) setAgentTabIndex(tabIdx);
      }
    }
  }, [activeTab]);

  // ── TTS sync: audio start → activate agent's tab + carousel card ──
  useEffect(() => {
    const onAudioStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const agentName = detail?.agentName;
      if (!agentName) return;

      // Find agent tab
      for (let i = validAgentMsgs.length - 1; i >= 0; i--) {
        if (validAgentMsgs[i].senderName?.toLowerCase() === agentName.toLowerCase()) {
          setAgentTabIndex(i);
          break;
        }
      }
      // Find carousel card
      const slice = getVisibleSlice(messages);
      for (let i = slice.length - 1; i >= 0; i--) {
        if ((slice[i] as Message).senderName?.toLowerCase() === agentName.toLowerCase()) {
          setCarouselIndex(i);
          break;
        }
      }
    };

    // ── TTS end: autoRun → advance to next tab ──
    const onAudioEnd = () => {
      if (!autoRun) return;
      // Auto-advance agent tab
      setAgentTabIndex(prev => {
        const maxIdx = validAgentMsgs.length - 1;
        return prev < maxIdx ? prev + 1 : prev;
      });
      // Auto-advance carousel
      setCarouselIndex(prev => {
        const slice = getVisibleSlice(messages);
        const maxIdx = slice.length - 1;
        return prev < maxIdx ? prev + 1 : prev;
      });
    };

    window.addEventListener('radio-audio-start', onAudioStart);
    window.addEventListener('radio-audio-end', onAudioEnd);
    return () => {
      window.removeEventListener('radio-audio-start', onAudioStart);
      window.removeEventListener('radio-audio-end', onAudioEnd);
    };
  }, [messages, validAgentMsgs, autoRun]);

  // ── Sync: agent tab click → carousel sync ──
  const onAgentTabClick = useCallback((idx: number) => {
    setAgentTabIndex(idx);
    // Find the matching message in the carousel slice
    const msg = validAgentMsgs[idx];
    if (!msg) return;
    const slice = getVisibleSlice(messages);
    const cIdx = slice.findIndex(m => m.id === msg.id);
    if (cIdx >= 0) setCarouselIndex(cIdx);
  }, [validAgentMsgs, messages]);

  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
    // Sync agent tab: find matching agent message
    const slice = getVisibleSlice(messages);
    const msg = slice[idx];
    if (msg && msg.senderType === 'assistant') {
      const tabIdx = validAgentMsgs.findIndex(m => m.id === msg.id);
      if (tabIdx >= 0) setAgentTabIndex(tabIdx);
    }
  }, [messages, validAgentMsgs]);

  return (
    <div className="app-layout-row">
      {/* Mobile overlay */}
      {!sidebarCollapsed && window.innerWidth < 768 && (
        <div className="lsb-overlay" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Permanent Left Sidebar */}
      <LeftSidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} onClose={() => setSidebarCollapsed(true)} />

      {/* Main Content */}
      <div className="app-main">
        <Navbar onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />

        {ttsEnabled && <AudioControlBar />}

        {/* Agent Tabs (horizontal, always visible when there are messages) */}
        {validAgentMsgs.length > 0 && (
          <AgentTabs
            validMessages={validAgentMsgs}
            activeIndex={agentTabIndex}
            onTabClick={onAgentTabClick}
          />
        )}

        {/* Tab Bar */}
        <div className="main-tab-bar">
          <button
            className={`main-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <span className="main-tab-icon">💬</span>
            <span className="main-tab-label">Chat</span>
          </button>
          <button
            className={`main-tab ${activeTab === 'carousel' ? 'active' : ''}`}
            onClick={() => setActiveTab('carousel')}
          >
            <span className="main-tab-icon">🎠</span>
            <span className="main-tab-label">Carousel</span>
          </button>
          <button
            className={`main-tab ${activeTab === 'podcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('podcast')}
          >
            <span className="main-tab-icon">🎙️</span>
            <span className="main-tab-label">Podcast</span>
          </button>
          <button
            className={`main-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <span className="main-tab-icon">🎯</span>
            <span className="main-tab-label">Task</span>
            {activeTask?.isActive && <span className="task-tab-badge" />}
          </button>
          <button
            className={`main-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <span className="main-tab-icon">🔧</span>
            <span className="main-tab-label">Studio</span>
          </button>
          <button
            className={`main-tab ${autoRun ? 'active' : ''}`}
            onClick={() => setAutoRun(!autoRun)}
            title={autoRun ? 'AutoRun ON' : 'AutoRun OFF'}
          >
            <span className="main-tab-icon">{autoRun ? '🔄' : '⏸'}</span>
            <span className="main-tab-label">Auto</span>
          </button>
        </div>

        {/* Content */}
        <div className="main-content-area">
          {activeTab === 'chat' && (
            validAgentMsgs.length > 0 ? (
              <div className="tab-msg-with-input">
                <TabMessageView
                  message={validAgentMsgs[agentTabIndex] || null}
                  index={agentTabIndex}
                  total={validAgentMsgs.length}
                />
                <InputBox />
              </div>
            ) : (
              <ChatContainer />
            )
          )}

          {activeTab === 'carousel' && (
            <div className="carousel-with-input">
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <Suspense fallback={
                  <div className="loading-fallback">Caricamento Carousel 3D...</div>
                }>
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
              <InputBox />
            </div>
          )}

          {activeTab === 'podcast' && (
            <div className="tab-content-padded">
              <PodcastMode />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="tab-content-padded">
              <TaskPanel />
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="tab-content-padded">
              <StudioPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
