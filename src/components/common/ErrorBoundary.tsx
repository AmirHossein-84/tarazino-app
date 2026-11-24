import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Resiliency Error Boundary preventing render-time faults in a tab or card
 * from crashing the entire Tarazino shell.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'خطای غیرمنتظره در نمایش این بخش',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Tarazino ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="glass-card border border-rose-500/30 p-6 my-4 text-center space-y-4 rounded-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {this.props.fallbackTitle || 'خطایی در نمایش این بخش رخ داد'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto break-words">
              اطلاعات پرتفوی شما ایمن است. می‌توانید مجدداً تلاش کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="touch-target interactive-tap inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تلاش مجدد</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
