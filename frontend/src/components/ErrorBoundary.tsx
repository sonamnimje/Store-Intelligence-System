import React from 'react';

type State = { error: Error | null; info: React.ErrorInfo | null };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught', error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-slate-100 p-6">
          <div className="max-w-3xl rounded-lg border border-rose-400/20 bg-rose-900/10 p-6">
            <h2 className="text-2xl font-semibold text-rose-300">An error occurred</h2>
            <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-200">{String(this.state.error && this.state.error.stack)}</pre>
            <div className="mt-4">
              <button onClick={() => window.location.reload()} className="rounded px-3 py-2 bg-rose-500/20">Reload</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as JSX.Element;
  }
}
