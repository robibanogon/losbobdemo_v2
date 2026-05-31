/**
 * @fileoverview Audit Routes
 * @module routes/audit
 * @description Provides endpoints for accessing audit trail logs
 */

const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const { authenticate } = require('../middleware/auth');

/**
 * Get all audit logs with optional filtering
 * @route GET /api/audit
 * @access Private
 * @param {string} [entity_id] - Filter by entity ID (query param)
 * @param {string} [entity_type] - Filter by entity type (query param)
 * @param {string} [actor_id] - Filter by actor ID (query param)
 * @param {string} [action] - Filter by action (query param)
 * @param {string} [start_date] - Filter by start date (query param)
 * @param {string} [end_date] - Filter by end date (query param)
 * @returns {Array} Array of audit log entries
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      entity_id: req.query.entity_id,
      entity_type: req.query.entity_type,
      actor_id: req.query.actor_id,
      action: req.query.action,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const logs = await auditService.getAll(filters);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get audit logs for a specific user
 * @route GET /api/audit/user/:userId
 * @access Private
 * @param {string} userId - User ID (URL param)
 * @returns {Array} Array of audit log entries for the user
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const logs = await auditService.getByUser(req.params.userId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Made with Bob
