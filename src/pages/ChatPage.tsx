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

const RadioCarousel3D = lazy(() =>
  import('../components/Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

type MainTab = 'chat' | 'carousel' | 'podcast' | 'agents';
const MAX_SLOTS = 8;

// Helper: filtra messaggi visibili nel carousel (solo human + assistant)
function getVisibleSlice(messages: { senderType: string }[]) {
  return messages
    .filter(m => m.senderType === 'assistant' || m.senderType === 'human')
    .slice(-MAX_SLOTS);
}

export function ChatPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const { messages } = useConversationContext();
  const { ttsEnabled } = useSettingsContext();

  // ── Carousel index: parte SEMPRE dall'ultimo messaggio ──
  const [carouselIndex, setCarouselIndex] = useState(() => {
    const slice = getVisibleSlice(messages);
    return Math.max(0, slice.length - 1);
  });

  const [autoAdvance, setAutoAdvance] = useState(() => {
    return localStorage.getItem('bartalk_auto_advance') !== 'false';
  });

  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('bartalk_carousel_voffset');
    return saved ? parseInt(saved) : 0;
  });

  // Track previous message count for auto-advance
  const prevMsgCountRef = useRef(0);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_zoom', String(carouselZoom));
  }, [carouselZoom]);
  useEffect(() => {
    localStorage.setItem('bartalk_carousel_voffset', String(carouselVerticalOffset));
  }, [carouselVerticalOffset]);
  useEffect(() => {
    localStorage.setItem('bartalk_auto_advance', String(autoAdvance));
  }, [autoAdvance]);

  // ── AUTO-ADVANCE: quando arrivano nuovi messaggi → vai all'ultimo ──
  useEffect(() => {
    const slice = getVisibleSlice(messages);
    const count = slice.length;

    if (count > prevMsgCountRef.current && count > 0) {
      // Nuovo messaggio: vai all'ultimo slot
      setCarouselIndex(count - 1);
    }
    prevMsgCountRef.current = count;
  }, [messages]);

  // ── TAB SWITCH: quando si apre il carousel, posizionati sull'ultimo messaggio ──
  useEffect(() => {
    if (activeTab === 'carousel') {
      const slice = getVisibleSlice(messages);
      if (slice.length > 0) {
        setCarouselIndex(slice.length - 1);
      }
    }
  }, [activeTab]); // Solo quando cambia tab, non ad ogni messaggio

  // ── TTS SYNC: quando TTS parla un agente, ruota il carousel su quel messaggio ──
  useEffect(() => {
    const onAudioStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const agentName = detail?.agentName;
      if (!agentName) return;

      const slice = getVisibleSlice(messages);
      // Cerca l'ULTIMO messaggio di questo agente nella slice visibile
      let targetIdx = -1;
      for (let i = slice.length - 1; i >= 0; i--) {
        const m = slice[i] as { senderType: string; senderName?: string };
        // Match per nome (case insensitive)
        if (m.senderName?.toLowerCase() === agentName.toLowerCase()) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx >= 0) {
        setCarouselIndex(targetIdx);
      }
    };

    const onAudioEnd = () => {
      if (!autoAdvance) return;
      // Auto-advance: vai al prossimo messaggio
      setCarouselIndex(prev => {
        const slice = getVisibleSlice(messages);
        const maxIdx = slice.length - 1;
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
  }, [messages, autoAdvance]);

  // ── Navigazione manuale del carousel (NON ferma TTS) ──
  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
  }, []);

  return (
    <div className="app-layout">
      <ConversationSidebar />
      <Navbar />

      {/* Audio Control Bar */}
      {ttsEnabled && <AudioControlBar />}

      {/* Tab Bar Principale */}
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

      {/* Contenuto principale */}
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
