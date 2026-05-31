/**
 * @fileoverview Application Entry Point
 * @module main
 * @description Initializes and renders the React application with error boundary
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

/**
 * Render the application
 * Wraps App in StrictMode and ErrorBoundary for development checks and error handling
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Made with Bob
