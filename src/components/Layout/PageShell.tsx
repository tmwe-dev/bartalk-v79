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
    <div className="page-shell">
      <Navbar />
      <div className="page-shell-content">
        {children}
      </div>
    </div>
  );
}
