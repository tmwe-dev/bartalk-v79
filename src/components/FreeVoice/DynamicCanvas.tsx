/**
 * BarTalk v8.2.5 — DynamicCanvas
 * Contenitore visivo dinamico per la modalità FreeVoice.
 * Mostra immagini, testo grande, e contenuti misti in base ai
 * comandi dal maestro (tag [VISUAL:...] nella risposta AI).
 *
 * Supporta:
 * - Immagini a schermo pieno con transizione fade
 * - Testo grande con font accessibile
 * - Combinazione immagine + testo sovrapposto
 * - Animazione pulsante durante la risposta AI (loading)
 * - Alto contrasto per ipovedenti
 * - aria-live per screen reader
 */

import { useState, useEffect, useRef } from 'react';

export interface CanvasContent {
  type: 'image' | 'text' | 'image-text' | 'empty';
  imageUrl?: string;
  text?: string;
  /** Dimensione font per testo: 'huge' (bambini) | 'large' (default) | 'medium' */
  fontSize?: 'huge' | 'large' | 'medium';
}

interface DynamicCanvasProps {
  content: CanvasContent;
  isLoading?: boolean;
  volume?: number; // 0-1, per animazione pulsante
  className?: string;
}

/** Parsa i tag [VISUAL:...] dalla risposta del maestro */
// eslint-disable-next-line react-refresh/only-export-components
export function parseVisualTags(response: string): { cleanText: string; visuals: CanvasContent[] } {
  const visuals: CanvasContent[] = [];
  let cleanText = response;

  // [IMG: url] — immagine
  const imgRegex = /\[IMG:\s*(https?:\/\/[^\]]+)\]/gi;
  let match;
  while ((match = imgRegex.exec(response)) !== null) {
    visuals.push({ type: 'image', imageUrl: match[1].trim() });
  }
  cleanText = cleanText.replace(imgRegex, '').trim();

  // [BIGTEXT: testo] — testo grande sul canvas
  const textRegex = /\[BIGTEXT:\s*([^\]]+)\]/gi;
  while ((match = textRegex.exec(response)) !== null) {
    visuals.push({ type: 'text', text: match[1].trim(), fontSize: 'huge' });
  }
  cleanText = cleanText.replace(textRegex, '').trim();

  // [VISUAL: url | testo] — immagine con testo
  const visualRegex = /\[VISUAL:\s*(https?:\/\/\S+)\s*\|\s*([^\]]+)\]/gi;
  while ((match = visualRegex.exec(response)) !== null) {
    visuals.push({ type: 'image-text', imageUrl: match[1].trim(), text: match[2].trim() });
  }
  cleanText = cleanText.replace(visualRegex, '').trim();

  return { cleanText, visuals };
}

export default function DynamicCanvas({ content, isLoading, volume = 0, className = '' }: DynamicCanvasProps) {
  const [fadeIn, setFadeIn] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevContentRef = useRef<string>('');

  // Trigger fade-in when content changes
  useEffect(() => {
    const key = JSON.stringify(content);
    if (key !== prevContentRef.current) {
      queueMicrotask(() => {
        setFadeIn(false);
        setImgLoaded(false);
      });
      prevContentRef.current = key;
      const t = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(t);
    }
  }, [content]);

  // Pulse scale basato sul volume (per animazione durante ascolto)
  const [pulseScale, setPulseScale] = useState(1);
  useEffect(() => {
    if (!isLoading) { queueMicrotask(() => setPulseScale(1)); return; }
    let raf: number;
    const animate = () => {
      setPulseScale(1 + Math.sin(Date.now() / 300) * 0.02);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isLoading]);

  const getFontSize = (): string => {
    switch (content.fontSize) {
      case 'huge': return 'clamp(2rem, 8vw, 5rem)';
      case 'medium': return 'clamp(1.2rem, 3vw, 2rem)';
      default: return 'clamp(1.5rem, 5vw, 3.5rem)';
    }
  };

  return (
    <div
      className={`fv-canvas ${className}`}
      role="img"
      aria-hidden="true"
      aria-live="polite"
      aria-label={content.text || 'Area visiva della lezione'}
      style={{
        transform: `scale(${pulseScale})`,
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Loading state */}
      {isLoading && content.type === 'empty' && (
        <div className="fv-canvas-loading">
          <div
            className="fv-canvas-orb"
            style={{
              transform: `scale(${1 + volume * 0.5})`,
            }}
          />
          <p className="fv-canvas-loading-text" aria-live="assertive">
            Sto pensando...
          </p>
        </div>
      )}

      {/* Image only */}
      {content.type === 'image' && content.imageUrl && (
        <div className={`fv-canvas-image ${fadeIn && imgLoaded ? 'fv-fade-in' : 'fv-fade-out'}`}>
          <img
            src={content.imageUrl}
            alt={content.text || 'Immagine della lezione'}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
          />
        </div>
      )}

      {/* Text only */}
      {content.type === 'text' && content.text && (
        <div
          className={`fv-canvas-text ${fadeIn ? 'fv-fade-in' : 'fv-fade-out'}`}
          style={{ fontSize: getFontSize() }}
        >
          {content.text}
        </div>
      )}

      {/* Image + Text overlay */}
      {content.type === 'image-text' && (
        <div className={`fv-canvas-mixed ${fadeIn && imgLoaded ? 'fv-fade-in' : 'fv-fade-out'}`}>
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt=""
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(false)}
            />
          )}
          {content.text && (
            <div className="fv-canvas-overlay-text" style={{ fontSize: getFontSize() }}>
              {content.text}
            </div>
          )}
        </div>
      )}

      {/* Empty state — mostra avatar grande del maestro */}
      {content.type === 'empty' && !isLoading && (
        <div className="fv-canvas-empty">
          <span className="fv-canvas-emoji" role="presentation">🎙️</span>
          <p>Parla — ti ascolto</p>
        </div>
      )}
    </div>
  );
}
