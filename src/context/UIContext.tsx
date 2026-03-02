import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface UIContextValue {
  settingsOpen: boolean;
  studioMode: boolean;
  toasts: Toast[];
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  setStudioMode: (open: boolean) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

let toastCounter = 0;

export function UIProvider({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [studioMode, setStudioMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setSettingsOpen(prev => !prev), []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-rimuovi dopo 4 secondi
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <UIContext.Provider value={{
      settingsOpen,
      studioMode,
      toasts,
      openSettings,
      closeSettings,
      toggleSettings,
      setStudioMode,
      addToast,
      removeToast,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIContext() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUIContext deve essere usato dentro UIProvider');
  return ctx;
}
