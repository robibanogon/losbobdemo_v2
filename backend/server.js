/**
 * @fileoverview Main server file for the Loan Origination System backend API
 * @module server
 * @description Express server that handles loan application processing, document management,
 * credit analysis, and decision workflows. Provides RESTful API endpoints for the frontend.
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fileStorage = require('./src/utils/fileStorage');
const authService = require('./src/services/authService');

// Import routes
const authRoutes = require('./src/routes/auth');
const applicationRoutes = require('./src/routes/applications');
const documentRoutes = require('./src/routes/documents');
const auditRoutes = require('./src/routes/audit');
const configRoutes = require('./src/routes/config');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Configure middleware for the Express application
 * - CORS: Enable cross-origin requests from frontend
 * - JSON parser: Parse JSON request bodies
 * - URL encoded parser: Parse URL-encoded request bodies
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware
 * Logs all incoming requests with timestamp, method, and path
 */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 * @route GET /health
 * @returns {Object} 200 - Server status and timestamp
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * API Routes
 * All routes are prefixed with /api
 */
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/config', configRoutes);

/**
 * 404 handler - must be AFTER all routes but BEFORE error handler
 * Catches all undefined routes and returns a 404 error
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/**
 * Global error handling middleware - must be LAST
 * Catches all errors thrown in the application and returns appropriate response
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * Initialize application
 * Sets up file storage and initializes default users
 * @async
 * @throws {Error} If initialization fails
 */
async function initialize() {
  try {
    console.log('Initializing Loan Origination System...');
    
    // Initialize file storage
    await fileStorage.initialize();
    console.log('✓ File storage initialized');
    
    // Initialize users
    await authService.initializeUsers();
    console.log('✓ Users initialized');
    
    console.log('✓ Initialization complete');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

/**
 * Start the Express server
 * Initializes the application and starts listening on the configured port
 * @async
 */
async function start() {
  await initialize();
  
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Loan Origination System - Backend API');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Server running on: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('  API Endpoints:');
    console.log(`    - Health Check: http://localhost:${PORT}/health`);
    console.log(`    - Auth: http://localhost:${PORT}/api/auth`);
    console.log(`    - Applications: http://localhost:${PORT}/api/applications`);
    console.log(`    - Documents: http://localhost:${PORT}/api/documents`);
    console.log(`    - Audit: http://localhost:${PORT}/api/audit`);
    console.log(`    - Config: http://localhost:${PORT}/api/config`);
    console.log('');
    console.log('  Demo Users:');
    console.log('    - RM: rm1 / password123');
    console.log('    - Analyst: analyst1 / password123');
    console.log('    - Approver: approver1 / password123');
    console.log('    - Admin: admin / admin123');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  });
}

/**
 * Handle graceful shutdown on SIGTERM signal
 * Ensures the server shuts down cleanly when terminated
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

/**
 * Handle graceful shutdown on SIGINT signal (Ctrl+C)
 * Ensures the server shuts down cleanly when interrupted
 */
process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;

// Made with Bob
