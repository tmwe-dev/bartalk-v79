/**
 * BarTalk v8 — MaestroAvatar Component
 * Avatar component for maestro teachers with animated speaking state.
 */

import type { MaestroDefinition } from '../../types/maestro';

interface MaestroAvatarProps {
  maestro: MaestroDefinition;
  size: 'sm' | 'md' | 'lg';
  isSpeaking?: boolean; // Animated border when speaking
}

export function MaestroAvatar({ maestro, size, isSpeaking }: MaestroAvatarProps) {
  const sizeClasses = {
    sm: 'maestro-avatar-circle--sm',
    md: 'maestro-avatar-circle--md',
    lg: 'maestro-avatar-circle--lg',
  };

  const fontSizes = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  const gradientStyle = {
    background: `linear-gradient(135deg, ${maestro.color}40 0%, ${maestro.color}20 100%)`,
  };

  return (
    <div
      className={`maestro-avatar-circle ${sizeClasses[size]} ${
        isSpeaking ? 'maestro-avatar-circle--speaking' : ''
      }`}
      style={gradientStyle}
    >
      <span style={{ fontSize: fontSizes[size] }}>{maestro.avatar}</span>
    </div>
  );
}
