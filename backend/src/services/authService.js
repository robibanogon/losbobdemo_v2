/**
 * @fileoverview Authentication Service - User authentication and authorization
 * @module services/authService
 * @description Handles user authentication, JWT token generation/verification,
 * and role-based permission checking.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fileStorage = require('../utils/fileStorage');
const auditService = require('./auditService');

const JWT_SECRET = process.env.JWT_SECRET || 'los-demo-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Authentication Service Class
 * Manages user authentication, JWT tokens, and role-based access control
 * @class
 */
class AuthService {
  /**
   * Initialize default demo users if none exist
   * Creates RM, Analyst, Approver, and Admin users
   * @async
   */
  async initializeUsers() {
    const users = await fileStorage.read('users');
    
    if (users.length === 0) {
      // Create default demo users
      const defaultUsers = [
        {
          id: uuidv4(),
          username: 'rm1',
          password: await bcrypt.hash('password123', 10),
          name: 'Maria Santos',
          role: 'RM',
          email: 'maria.santos@bank.ph',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          username: 'analyst1',
          password: await bcrypt.hash('password123', 10),
          name: 'Juan Dela Cruz',
          role: 'Credit Analyst',
          email: 'juan.delacruz@bank.ph',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          username: 'approver1',
          password: await bcrypt.hash('password123', 10),
          name: 'Ana Reyes',
          role: 'Approver',
          email: 'ana.reyes@bank.ph',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          username: 'admin',
          password: await bcrypt.hash('admin123', 10),
          name: 'System Admin',
          role: 'Admin',
          email: 'admin@bank.ph',
          created_at: new Date().toISOString()
        }
      ];

      await fileStorage.write('users', defaultUsers);
      console.log('Default users created');
    }
  }

  /**
   * Authenticate user and generate JWT token
   * @async
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {Object} [metadata={}] - Additional metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} Object with user (without password) and JWT token
   * @throws {Error} If credentials are invalid
   */
  async login(username, password, metadata = {}) {
    const users = await fileStorage.read('users');
    const user = users.find(u => u.username === username);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Log login action
    await auditService.log({
      actor_id: user.id,
      actor_name: user.name,
      action: auditService.ACTIONS.LOGIN,
      entity_type: 'User',
      entity_id: user.id,
      metadata
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Verify JWT token and return user
   * @async
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} User object without password
   * @throws {Error} If token is invalid or expired
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await fileStorage.findById('users', decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   * @async
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object without password
   * @throws {Error} If user not found
   */
  async getUserById(userId) {
    const user = await fileStorage.findById('users', userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get all users
   * @async
   * @returns {Promise<Array>} Array of user objects without passwords
   */
  async getAllUsers() {
    const users = await fileStorage.read('users');
    return users.map(({ password, ...user }) => user);
  }

  /**
   * Check if role is Relationship Manager
   * @param {string} role - User role
   * @returns {boolean} True if role is RM
   */
  isRM(role) {
    return role === 'RM';
  }

  /**
   * Check if role is Credit Analyst
   * @param {string} role - User role
   * @returns {boolean} True if role is Credit Analyst
   */
  isAnalyst(role) {
    return role === 'Credit Analyst';
  }

  /**
   * Check if role is Approver
   * @param {string} role - User role
   * @returns {boolean} True if role is Approver
   */
  isApprover(role) {
    return role === 'Approver';
  }

  /**
   * Check if role is Admin
   * @param {string} role - User role
   * @returns {boolean} True if role is Admin
   */
  isAdmin(role) {
    return role === 'Admin';
  }

  /**
   * Check if user can edit an application
   * @param {string} role - User role
   * @param {string} status - Application status
   * @returns {boolean} True if user can edit
   */
  canEditApplication(role, status) {
    if (this.isAdmin(role)) return true;
    if (status === 'Draft' && this.isRM(role)) return true;
    return false;
  }

  /**
   * Check if user can edit analysis assumptions
   * @param {string} role - User role
   * @param {string} status - Application status
   * @returns {boolean} True if user can edit assumptions
   */
  canEditAssumptions(role, status) {
    if (this.isAdmin(role)) return true;
    if ((status === 'Submitted' || status === 'In Review') && this.isAnalyst(role)) return true;
    return false;
  }

  /**
   * Check if user can approve applications
   * @param {string} role - User role
   * @returns {boolean} True if user can approve
   */
  canApprove(role) {
    return this.isApprover(role) || this.isAdmin(role);
  }
}

module.exports = new AuthService();

// Made with Bob
