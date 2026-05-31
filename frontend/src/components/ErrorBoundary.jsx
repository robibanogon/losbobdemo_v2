/**
 * @fileoverview Error Boundary Component - Catches and handles React errors
 * @module components/ErrorBoundary
 * @description React error boundary that catches JavaScript errors anywhere in the
 * child component tree, logs errors, and displays a fallback UI.
 */

import React from 'react';

/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * @class
 * @extends React.Component
 */
class ErrorBoundary extends React.Component {
  /**
   * Create an ErrorBoundary instance
   * @param {Object} props - Component props
   */
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Update state when an error is caught
   * @static
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state with hasError flag
   */
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  /**
   * Log error details when an error is caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Object with componentStack key containing stack trace
   */
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  /**
   * Render error UI or children
   * @returns {JSX.Element} Error UI if error occurred, otherwise children
   */
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            We're sorry for the inconvenience. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '30px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Made with Bob
