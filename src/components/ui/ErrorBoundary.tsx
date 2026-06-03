import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-hippo-bg p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-semibold text-hippo-fg">Something went wrong</h1>
            <p className="max-w-sm text-sm text-hippo-muted">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="mt-2 rounded-lg bg-hippo-primary px-4 py-2 text-sm font-medium text-hippo-primary-fg"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
