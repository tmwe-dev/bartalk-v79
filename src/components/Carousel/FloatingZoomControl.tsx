import { useState } from 'react';

interface FloatingZoomControlProps {
  zoom: number;
  onZoomChange: (z: number) => void;
  verticalOffset: number;
  onVerticalOffsetChange: (o: number) => void;
}

export function FloatingZoomControl({
  zoom, onZoomChange, verticalOffset, onVerticalOffsetChange
}: FloatingZoomControlProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="floating-zoom-control"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Zoom Slider */}
      <div className="zoom-slider-group">
        {isHovered && (
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        )}
        <input
          type="range"
          className="zoom-slider"
          min={0.5}
          max={2.0}
          step={0.01}
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          title={`Zoom: ${Math.round(zoom * 100)}%`}
        />
        <span className="zoom-icon">🔍</span>
      </div>

      <div className="zoom-divider" />

      {/* Vertical Offset Slider */}
      <div className="zoom-slider-group">
        {isHovered && (
          <span className="zoom-label">
            {verticalOffset > 0 ? '+' : ''}{verticalOffset}px
          </span>
        )}
        <input
          type="range"
          className="zoom-slider"
          min={-200}
          max={200}
          step={5}
          value={verticalOffset}
          onChange={(e) => onVerticalOffsetChange(parseInt(e.target.value))}
          title={`Offset: ${verticalOffset}px`}
        />
        <span className="zoom-icon">↕️</span>
      </div>
    </div>
  );
}
