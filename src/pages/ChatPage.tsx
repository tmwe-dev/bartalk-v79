import { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { ChatContainer } from '../components/Chat/ChatContainer';
import { InputBox } from '../components/Chat/InputBox';
import { AgentSelector } from '../components/Agents/AgentSelector';
import { PodcastMode } from '../components/Podcast/PodcastMode';
import { FloatingZoomControl } from '../components/Carousel/FloatingZoomControl';
import { ConversationSidebar } from '../components/Chat/ConversationSidebar';
import { AudioControlBar } from '../components/Chat/AudioControlBar';
import { useConversationContext } from '../context/ConversationContext';
import { useSettingsContext } from '../context/SettingsContext';
import { stopTTS } from '../lib/tts';
import { getAgent } from '../lib/agents';

const RadioCarousel3D = lazy(() =>
  import('../components/Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

type MainTab = 'chat' | 'carousel' | 'podcast' | 'agents';

// Helper: filtra messaggi visibili nel carousel (tutti tranne system)
function getVisibleMessages(messages: { senderType: string; senderName?: string }[]) {
  return messages.filter(m => m.senderType === 'assistant' || m.senderType === 'human');
}

export function ChatPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(() => {
    return localStorage.getItem('bartalk_auto_advance') !== 'false';
  });
  const { messages } = useConversationContext();
  const { ttsEnabled } = useSettingsContext();
  const prevMsgCountRef = useRef(0);

  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_voffset');
    return saved ? parseInt(saved) : 0;
  });

  // Persist zoom
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_zoom', String(carouselZoom));
  }, [carouselZoom]);

  // Persist vertical offset
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_voffset', String(carouselVerticalOffset));
  }, [carouselVerticalOffset]);

  // Persist auto-advance
  useEffect(() => {
    localStorage.setItem('bartalk_auto_advance', String(autoAdvance));
  }, [autoAdvance]);

  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
    // Quando l'utente naviga manualmente, ferma l'audio corrente
    if (!autoAdvance) {
      stopTTS();
    }
  }, [autoAdvance]);

  // ── AUTO-ADVANCE: quando arriva un nuovo messaggio, vai all'ultimo ──
  useEffect(() => {
    const visible = getVisibleMessages(messages);
    const count = visible.length;
    if (count > prevMsgCountRef.current && count > 0) {
      // Nuovo messaggio arrivato → vai all'ultimo
      setCarouselIndex(Math.min(count - 1, 7)); // max 8 slot
    }
    prevMsgCountRef.current = count;
  }, [messages]);

  // ── TTS SYNC: quando TTS inizia a parlare un agente, ruota il carousel ──
  useEffect(() => {
    const onAudioStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const agentName = detail?.agentName;
      if (!agentName) return;

      // Trova l'indice del messaggio di questo agente nel carousel
      const visible = getVisibleMessages(messages);
      const visibleSlice = visible.slice(-8); // ultimi 8

      // Cerca l'ULTIMO messaggio di questo agente (il più recente)
      const agent = getAgent(agentName);
      const targetName = agent?.name || agentName;
      let targetIdx = -1;
      for (let i = visibleSlice.length - 1; i >= 0; i--) {
        const m = visibleSlice[i] as { senderName?: string };
        if (m.senderName === targetName) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx >= 0 && targetIdx !== carouselIndex) {
        setCarouselIndex(targetIdx);
      }
    };

    const onAudioEnd = () => {
      if (!autoAdvance) return;
      // Auto-advance: vai al prossimo messaggio
      const visible = getVisibleMessages(messages);
      const maxIdx = Math.min(visible.length, 8) - 1;
      setCarouselIndex(prev => {
        const next = prev + 1;
        return next <= maxIdx ? next : prev;
      });
    };

    window.addEventListener('radio-audio-start', onAudioStart);
    window.addEventListener('radio-audio-end', onAudioEnd);
    return () => {
      window.removeEventListener('radio-audio-start', onAudioStart);
      window.removeEventListener('radio-audio-end', onAudioEnd);
    };
  }, [messages, carouselIndex, autoAdvance]);

  return (
    <div className="app-layout">
      <ConversationSidebar />
      <Navbar />

      {/* ── Audio Control Bar (sempre visibile se TTS attivo) ── */}
      {ttsEnabled && (
        <AudioControlBar />
      )}

      {/* ── Tab Bar Principale ── */}
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
          className={`main-tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          <span className="main-tab-icon">🤖</span>
          <span className="main-tab-label">Agenti</span>
        </button>

        {/* Auto-advance toggle */}
        <button
          className={`main-tab ${autoAdvance ? 'active' : ''}`}
          onClick={() => setAutoAdvance(!autoAdvance)}
          title={autoAdvance ? 'Auto-avanzamento ON' : 'Auto-avanzamento OFF'}
        >
          <span className="main-tab-icon">{autoAdvance ? '🔄' : '⏸'}</span>
          <span className="main-tab-label">Auto</span>
        </button>
      </div>

      {/* ── Contenuto principale ── */}
      <div className="main-content-area">
        {activeTab === 'chat' && <ChatContainer />}

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

        {activeTab === 'agents' && (
          <div className="tab-content-padded">
            <AgentSelector />
          </div>
        )}
      </div>
    </div>
  );
}
