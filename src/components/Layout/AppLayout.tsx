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
      <a href="#main-content" className="sr-only focus-visible">
        Vai al contenuto principale
      </a>
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
