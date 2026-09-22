/* Catches a render-time crash in any page and shows a scoped fallback
   instead of a full white screen — providing clear diagnostic details
   and recovery actions for the user. */
import React, { Component } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null, showDetails: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}\n\nComponent Stack:\n${errorInfo?.componentStack || 'N/A'}\n\nUser Agent: ${navigator.userAgent}\nTimestamp: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.error) {
      const { error, errorInfo, showDetails, copied } = this.state;
      const errorMessage = error?.message || 'An unexpected runtime error occurred.';

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 w-full">
          <div className="relative max-w-xl w-full">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-500/10 dark:bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary-500/10 dark:bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Main Card */}
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-red-200/80 dark:border-red-900/40 rounded-3xl shadow-2xl overflow-hidden">
              {/* Top Accent Line */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

              <div className="p-6 sm:p-8 text-center space-y-6">
                {/* Error Icon Badge */}
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute inset-0 rounded-lg bg-red-500/20 dark:bg-red-500/30 animate-ping opacity-25" />
                  <div className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-red-500/10 to-rose-500/20 dark:from-red-950/50 dark:to-rose-900/30 border border-red-200 dark:border-red-800/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                </div>

                {/* Status & Title */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200/60 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Runtime Exception Caught
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Something went wrong
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    An error occurred while rendering this component. Don't worry, the rest of your session is protected.
                  </p>
                </div>

                {/* Concise Error Box */}
                <div className="p-3.5 rounded-lg bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-mono font-medium text-red-800 dark:text-red-300 break-all leading-snug">
                      {errorMessage}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-red-500/20 hover:shadow-red-500/30 transition-all active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>

                  <a
                    href="/command"
                    onClick={this.handleRetry}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </a>
                </div>

                {/* Toggle Technical Details */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    {showDetails ? 'Hide Technical Details' : 'View Diagnostic Logs'}
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDetails && (
                    <div className="mt-3 text-left space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Stack Trace & Metadata
                        </span>
                        <button
                          type="button"
                          onClick={this.handleCopyDetails}
                          className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-medium"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Details
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3.5 rounded-lg bg-gray-950 text-gray-300 font-mono text-[11px] overflow-x-auto max-h-48 custom-scrollbar border border-gray-800 leading-relaxed select-all">
                        <p className="text-red-400 font-semibold mb-1">
                          {error?.name || 'Error'}: {error?.message}
                        </p>
                        {errorInfo?.componentStack ? (
                          <pre className="text-gray-400 text-[10px] whitespace-pre-wrap">
                            {errorInfo.componentStack}
                          </pre>
                        ) : (
                          <p className="text-gray-500 italic">No component stack available.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

