import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — cattura tutti gli errori React non gestiti.
 * Mostra un fallback UI invece di un crash bianco.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          padding: '32px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#e53e3e', fontSize: '20px' }}>
            Qualcosa è andato storto
          </h2>
          <p style={{ margin: '0 0 16px', color: '#718096', fontSize: '14px', maxWidth: '400px' }}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#3182ce',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
