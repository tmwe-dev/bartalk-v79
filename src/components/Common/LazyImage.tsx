/**
 * BarTalk v8.2.5 — LazyImage
 * Image component with native lazy loading and fade-in on load.
 */

import React, { useState, useCallback } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export function LazyImage({ src, alt, fallback, style, className = '', ...props }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const imgSrc = error && fallback ? fallback : src;

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${className} ${loaded ? 'animate-fade-in' : ''}`}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
