import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
  /** Optional compact fallback (e.g. for a single card) instead of full-page. */
  compact?: boolean;
}
interface State {
  error: Error | null;
}

/** Catches render-time throws so one bad component (or a corrupt/hostile
 *  imported set hitting the notation renderer) can't blank the whole app with no
 *  recovery. Offers a reload, and — at the top level — a "clear saved data"
 *  escape hatch in case persisted state is the cause and reproduces on reload. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console for debugging; no remote logging (local-only app).
    console.error('Unhandled error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  clearAndReload = () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="surface-card rounded-[12px] p-4 text-center">
          <p className="text-sm text-danger-text">Something went wrong here.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={this.reset}>
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center p-8 text-fg">
        <div className="surface-card flex max-w-md flex-col gap-4 rounded-[14px] p-6 text-center">
          <h1 className="text-lg font-medium">Something went wrong</h1>
          <p className="text-sm text-fg-secondary">
            The app hit an unexpected error. Reloading usually fixes it. If it
            keeps happening, clearing saved data resets the app (your session
            history in this browser will be removed).
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="destructive" onClick={this.clearAndReload}>
              Clear saved data &amp; reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
