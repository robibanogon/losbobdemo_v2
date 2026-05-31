/**
 * @fileoverview Audit Service - System audit logging
 * @module services/auditService
 * @description Provides comprehensive audit trail logging for all system actions,
 * including before/after state tracking and metadata capture.
 */

const { v4: uuidv4 } = require('uuid');
const fileStorage = require('../utils/fileStorage');

/**
 * Audit Service Class
 * Manages system-wide audit logging and trail
 * @class
 */
class AuditService {
  /**
   * Log an audit entry
   * @async
   * @param {Object} auditEntry - Audit entry data
   * @param {string} auditEntry.actor_id - ID of user performing action
   * @param {string} auditEntry.actor_name - Name of user performing action
   * @param {string} auditEntry.action - Action performed (use ACTIONS constants)
   * @param {string} auditEntry.entity_type - Type of entity affected
   * @param {string} auditEntry.entity_id - ID of entity affected
   * @param {Object} [auditEntry.before] - State before action
   * @param {Object} [auditEntry.after] - State after action
   * @param {Object} [auditEntry.metadata] - Additional metadata
   * @param {string} [auditEntry.ip_address] - IP address of user
   * @param {string} [auditEntry.user_agent] - User agent string
   * @returns {Promise<Object>} Created audit log entry
   */
  async log(auditEntry) {
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      actor_id: auditEntry.actor_id,
      actor_name: auditEntry.actor_name,
      action: auditEntry.action,
      entity_type: auditEntry.entity_type,
      entity_id: auditEntry.entity_id,
      before: auditEntry.before || null,
      after: auditEntry.after || null,
      metadata: {
        ip_address: auditEntry.ip_address || null,
        user_agent: auditEntry.user_agent || null,
        ...auditEntry.metadata
      }
    };

    await fileStorage.append('auditLog', entry);
    return entry;
  }

  /**
   * Get all audit logs with optional filtering
   * @async
   * @param {Object} [filters={}] - Filter criteria
   * @param {string} [filters.entity_id] - Filter by entity ID
   * @param {string} [filters.entity_type] - Filter by entity type
   * @param {string} [filters.actor_id] - Filter by actor ID
   * @param {string} [filters.action] - Filter by action
   * @param {string} [filters.start_date] - Filter by start date (ISO string)
   * @param {string} [filters.end_date] - Filter by end date (ISO string)
   * @returns {Promise<Array>} Array of audit log entries sorted by timestamp descending
   */
  async getAll(filters = {}) {
    const logs = await fileStorage.read('auditLog');
    
    let filtered = logs;

    if (filters.entity_id) {
      filtered = filtered.filter(log => log.entity_id === filters.entity_id);
    }

    if (filters.entity_type) {
      filtered = filtered.filter(log => log.entity_type === filters.entity_type);
    }

    if (filters.actor_id) {
      filtered = filtered.filter(log => log.actor_id === filters.actor_id);
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.start_date) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.start_date));
    }

    if (filters.end_date) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filters.end_date));
    }

    // Sort by timestamp descending (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get audit logs for a specific application
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Array of audit log entries for the application
   */
  async getByApplication(applicationId) {
    return this.getAll({ entity_id: applicationId });
  }

  /**
   * Get audit logs for a specific user
   * @async
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of audit log entries for the user
   */
  async getByUser(userId) {
    return this.getAll({ actor_id: userId });
  }

}

/**
 * Audit action constants
 * Standard action types for audit logging
 * @constant
 * @type {Object}
 */
const ACTIONS = {
  CREATE_APPLICATION: 'CREATE_APPLICATION',
  UPDATE_APPLICATION: 'UPDATE_APPLICATION',
  DELETE_APPLICATION: 'DELETE_APPLICATION',
  SUBMIT_APPLICATION: 'SUBMIT_APPLICATION',
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
  RUN_AGENT_REVIEW: 'RUN_AGENT_REVIEW',
  CREATE_ANALYSIS: 'CREATE_ANALYSIS',
  UPDATE_ANALYSIS: 'UPDATE_ANALYSIS',
  UPDATE_ASSUMPTIONS: 'UPDATE_ASSUMPTIONS',
  SUBMIT_RECOMMENDATION: 'SUBMIT_RECOMMENDATION',
  APPROVE_APPLICATION: 'APPROVE_APPLICATION',
  REJECT_APPLICATION: 'REJECT_APPLICATION',
  GENERATE_MEMO: 'GENERATE_MEMO',
  COMPLETE_APPLICATION: 'COMPLETE_APPLICATION',
  UPDATE_POLICY: 'UPDATE_POLICY',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT'
};

const auditServiceInstance = new AuditService();
auditServiceInstance.ACTIONS = ACTIONS;

module.exports = auditServiceInstance;

// Made with Bob
