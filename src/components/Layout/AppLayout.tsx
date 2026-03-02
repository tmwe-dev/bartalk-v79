import { type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { AgentSelector } from '../Agents/AgentSelector';

interface AppLayoutProps {
  children: ReactNode;
  sidebar?: boolean;
}

export function AppLayout({ children, sidebar = true }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-body">
        {sidebar && (
          <aside className="sidebar">
            <AgentSelector />
          </aside>
        )}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
