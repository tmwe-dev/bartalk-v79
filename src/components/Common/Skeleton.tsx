/**
 * BarTalk v8.2.5 — Skeleton Loaders
 * Placeholder components shown during content loading.
 */

// React 19 JSX transform — no explicit import needed

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

/** Generic skeleton block */
export function Skeleton({ width, height = '14px', borderRadius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a single chat message */
export function MessageSkeleton() {
  return (
    <div className="skeleton-message" aria-hidden="true">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton-message-body">
        <div className="skeleton skeleton-text skeleton-text-short" />
        <div className="skeleton skeleton-text skeleton-text-full" />
        <div className="skeleton skeleton-text skeleton-text-medium" />
      </div>
    </div>
  );
}

/** Multiple message skeletons for chat loading state */
export function ChatSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Caricamento messaggi">
      <span className="sr-only">Caricamento messaggi in corso...</span>
      {Array.from({ length: count }, (_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a card-like element */
export function CardSkeleton() {
  return (
    <div className="skeleton skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-text skeleton-text-short" style={{ marginBottom: 12 }} />
      <div className="skeleton skeleton-text skeleton-text-full" />
      <div className="skeleton skeleton-text skeleton-text-medium" />
    </div>
  );
}

/** Skeleton for sidebar list items */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Caricamento lista">
      <span className="sr-only">Caricamento...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ padding: '8px 0' }}>
          <div className="skeleton skeleton-text skeleton-text-medium" />
        </div>
      ))}
    </div>
  );
}
