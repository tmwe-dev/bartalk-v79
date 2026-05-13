import { useState } from 'react';
import { useT } from '../../lib/i18n';
import type { VoiceSuggestion } from '../../lib/voiceSuggester';

interface VoiceSuggestionModalProps {
  suggestions: VoiceSuggestion[];
  targetLanguage: string;
  onAccept: (suggestions: VoiceSuggestion[]) => void;
  onDismiss: () => void;
}

export function VoiceSuggestionModal({
  suggestions,
  targetLanguage: _targetLanguage,
  onAccept,
  onDismiss,
}: VoiceSuggestionModalProps) {
  const t = useT();
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(
    null
  );

  const handlePreview = (previewUrl?: string) => {
    if (!previewUrl) return;

    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }

    const audio = new Audio(previewUrl);
    setPreviewAudio(audio);
    audio.play().catch(err => {
      console.error('Failed to play preview:', err);
    });
  };

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal voice-suggest-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{t('voiceSuggestTitle')}</h3>
          <button className="modal-close" onClick={onDismiss}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="voice-suggest-desc">{t('voiceSuggestDesc')}</p>
          <div className="voice-suggest-list">
            {suggestions.map((s, i) => (
              <div key={i} className="voice-suggest-item">
                <div className="voice-suggest-agent">{s.agentName}</div>
                <div className="voice-suggest-voice">{s.voiceName}</div>
                {s.previewUrl && (
                  <button
                    className="btn btn-sm"
                    onClick={() => handlePreview(s.previewUrl)}
                  >
                    ▶ {t('voiceSuggestPreview')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-primary"
            onClick={() => onAccept(suggestions)}
          >
            {t('voiceSuggestUpdate')}
          </button>
          <button className="btn btn-secondary" onClick={onDismiss}>
            {t('voiceSuggestKeep')}
          </button>
        </div>
      </div>
    </div>
  );
}
