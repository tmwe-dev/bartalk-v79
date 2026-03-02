import { useState, useCallback, lazy, Suspense } from 'react';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { TypingIndicator } from './TypingIndicator';
import { useConversationContext } from '../../context/ConversationContext';

// Lazy load Three.js carousel per code-splitting (~500KB)
const RadioCarousel3D = lazy(() =>
  import('../Carousel/RadioCarousel3D').then(m => ({ default: m.RadioCarousel3D }))
);

type ViewMode = 'chat' | 'carousel';

export function ChatContainer() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { messages } = useConversationContext();

  const onCarouselIndexChange = useCallback((idx: number) => {
    setCarouselIndex(idx);
  }, []);

  return (
    <div className="chat-container">
      {/* Toggle vista */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${viewMode === 'chat' ? 'active' : ''}`}
            onClick={() => setViewMode('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'carousel' ? 'active' : ''}`}
            onClick={() => setViewMode('carousel')}
          >
            🎠 Carousel
          </button>
        </div>
      </div>

      {viewMode === 'chat' ? (
        <>
          <MessageList />
          <TypingIndicator />
        </>
      ) : (
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Caricamento Carousel 3D...</div>}>
          <RadioCarousel3D
            messages={messages}
            currentIndex={carouselIndex}
            onIndexChange={onCarouselIndexChange}
          />
        </Suspense>
      )}
      <InputBox />
    </div>
  );
}
