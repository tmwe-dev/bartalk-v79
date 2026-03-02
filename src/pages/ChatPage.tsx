import { useState, useCallback, lazy, Suspense } from 'react';
import { Navbar } from '../components/Layout/Navbar';
import { ChatContainer } from '../components/Chat/ChatContainer';
import { InputBox } from '../components/Chat/InputBox';
import { AgentSelector } from '../components/Agents/AgentSelector';
import { PodcastMode } from '../components/Podcast/PodcastMode';
import { useConversationContext } from '../context/ConversationContext';

const RadioCarousel3D = lazy(() =>
  import('../components/Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

type MainTab = 'chat' | 'carousel' | 'podcast' | 'agents';

export function ChatPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { messages } = useConversationContext();

  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
  }, []);

  return (
    <div className="app-layout">
      <Navbar />

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
      </div>

      {/* ── Contenuto principale ── */}
      <div className="main-content-area">
        {activeTab === 'chat' && <ChatContainer />}

        {activeTab === 'carousel' && (
          <div className="carousel-with-input">
            <Suspense fallback={
              <div className="loading-fallback">Caricamento Carousel 3D...</div>
            }>
              <RadioCarousel3D
                messages={messages}
                currentIndex={carouselIndex}
                onIndexChange={onCarouselIndexChange}
              />
            </Suspense>
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
