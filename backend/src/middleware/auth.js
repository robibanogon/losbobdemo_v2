/**
 * @fileoverview Authentication and Authorization Middleware
 * @module middleware/auth
 * @description Provides middleware functions for JWT token verification and role-based access control
 */

const authService = require('../services/authService');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user to request
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if authenticated user has required role
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * @example
 * // Only RM and Admin can access
 * router.post('/applications', authenticate, authorize('RM', 'Admin'), handler);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};

// Made with Bob
