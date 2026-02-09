import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary component wrapper
 * Catches runtime errors and displays user-friendly message
 */
export default class ErrorBoundaryWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold">Something went wrong</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              We encountered an unexpected error. Try refreshing the page or contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto mb-4 max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReset} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}