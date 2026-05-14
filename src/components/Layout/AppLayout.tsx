import { type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { AgentSelector } from '../Agents/AgentSelector';
import { PodcastMode } from '../Podcast/PodcastMode';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: boolean;
}

export function AppLayout({ children, sidebar = true }: AppLayoutProps) {
  return (
    <div className="app-layout">
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-link" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden', zIndex: 9999 }} onFocus={(e) => { e.currentTarget.style.position = 'fixed'; e.currentTarget.style.left = '16px'; e.currentTarget.style.top = '16px'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; e.currentTarget.style.overflow = 'visible'; e.currentTarget.style.background = '#1a1a2e'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.padding = '12px 24px'; e.currentTarget.style.borderRadius = '8px'; e.currentTarget.style.fontSize = '16px'; e.currentTarget.style.textDecoration = 'none'; }} onBlur={(e) => { e.currentTarget.style.position = 'absolute'; e.currentTarget.style.left = '-9999px'; e.currentTarget.style.width = '1px'; e.currentTarget.style.height = '1px'; e.currentTarget.style.overflow = 'hidden'; }}>Vai al contenuto principale</a>
      <Navbar />
      <div className="app-body">
        {sidebar && (
          <aside className="sidebar" aria-label="Selezione agenti">
            <AgentSelector />
            <PodcastMode />
          </aside>
        )}
        <main id="main-content" className="main-content" role="main">
          {children}
        </main>
      </div>
      {/* ARIA live region for status announcements */}
      <div
        id="status-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* ARIA live region for urgent announcements (errors) */}
      <div
        id="alert-announcer"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}
