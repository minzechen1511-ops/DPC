import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuotaError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected application error occurred.';
    let display = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        display = parsed.error;
      }
    } catch {
      // plain error message
    }
    const isQuotaError = display.includes('Quota exceeded');
    return {
      hasError: true,
      message: display,
      isQuotaError,
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Studio ErrorBoundary caught error:', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h1 className="text-lg font-bold text-slate-900">
              {this.state.isQuotaError ? 'Daily Cloud Quota Reached' : 'Workspace Sync Interrupted'}
            </h1>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed break-words">
            {this.state.message}
          </p>

          {this.state.isQuotaError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5">
              <p>
                Free-tier Firestore quota resets daily. You can review or upgrade quota directly in
                Firebase Console:
              </p>
              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-700 underline break-all"
              >
                Open Firebase Firestore Quota & Upgrade Dialog
              </a>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Studio</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
