/**
 * PageShell — Layout wrapper per tutte le pagine V2 (non-Chat).
 * Fornisce Navbar + contenuto scrollabile full-height.
 */

import { type ReactNode } from 'react';
import { Navbar } from './Navbar';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="page-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="page-shell-content" role="main" aria-label="Contenuto pagina">
        {children}
      </main>
    </div>
  );
}
