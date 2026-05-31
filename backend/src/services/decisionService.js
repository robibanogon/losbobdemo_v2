/**
 * @fileoverview Decision Service - Decision workflow management
 * @module services/decisionService
 * @description Handles credit analyst recommendations and approver decisions
 * for loan applications, including conditions and rejection reasons.
 */

const { v4: uuidv4 } = require('uuid');
const fileStorage = require('../utils/fileStorage');
const auditService = require('./auditService');
const applicationService = require('./applicationService');

/**
 * Decision Service Class
 * Manages the decision workflow from recommendation to final approval/rejection
 * @class
 */
class DecisionService {
  /**
   * Submit credit analyst recommendation
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} recommendationData - Recommendation details
   * @param {string} recommendationData.recommended_decision - Recommended decision (Approve/Reject)
   * @param {string} [recommendationData.recommendation_notes] - Notes explaining recommendation
   * @param {string} userId - ID of analyst submitting recommendation
   * @param {string} userName - Name of analyst submitting recommendation
   * @returns {Promise<Object>} Decision object with recommendation
   * @throws {Error} If application not found or decision is finalized
   */
  async submitRecommendation(applicationId, recommendationData, userId, userName) {
    const application = await fileStorage.findById('applications', applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    // Check if decision already exists
    let decision = await this.getByApplication(applicationId);
    
    if (decision && decision.is_final) {
      throw new Error('Decision is already finalized and cannot be modified');
    }

    const decisionData = {
      id: decision ? decision.id : uuidv4(),
      application_id: applicationId,
      recommended_by: userId,
      recommended_decision: recommendationData.recommended_decision,
      recommendation_notes: recommendationData.recommendation_notes || '',
      recommended_at: new Date().toISOString(),
      approver_id: null,
      final_decision: null,
      conditions: [],
      rejection_reason: null,
      decided_at: null,
      is_final: false
    };

    if (decision) {
      // Update existing decision
      const result = await fileStorage.update('decisions', decision.id, decisionData);
      
      await auditService.log({
        actor_id: userId,
        actor_name: userName,
        action: auditService.ACTIONS.SUBMIT_RECOMMENDATION,
        entity_type: 'Decision',
        entity_id: decision.id,
        before: decision,
        after: result.new
      });
      
      return result.new;
    } else {
      // Create new decision
      await fileStorage.append('decisions', decisionData);
      
      await auditService.log({
        actor_id: userId,
        actor_name: userName,
        action: auditService.ACTIONS.SUBMIT_RECOMMENDATION,
        entity_type: 'Decision',
        entity_id: decisionData.id,
        after: decisionData
      });
      
      return decisionData;
    }
  }

  /**
   * Finalize decision (approve or reject application)
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} finalDecisionData - Final decision details
   * @param {string} finalDecisionData.final_decision - Final decision (Approved/Rejected)
   * @param {Array} [finalDecisionData.conditions] - Approval conditions
   * @param {string} [finalDecisionData.rejection_reason] - Rejection reason
   * @param {string} userId - ID of approver making decision
   * @param {string} userName - Name of approver making decision
   * @returns {Promise<Object>} Finalized decision object
   * @throws {Error} If application not found, no recommendation exists, or decision already finalized
   */
  async finalizeDecision(applicationId, finalDecisionData, userId, userName) {
    const application = await fileStorage.findById('applications', applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    let decision = await this.getByApplication(applicationId);
    
    if (!decision) {
      throw new Error('No recommendation found. Analyst must submit recommendation first.');
    }

    if (decision.is_final) {
      throw new Error('Decision is already finalized');
    }

    const updates = {
      approver_id: userId,
      final_decision: finalDecisionData.final_decision,
      conditions: finalDecisionData.conditions || [],
      rejection_reason: finalDecisionData.rejection_reason || null,
      decided_at: new Date().toISOString(),
      is_final: true
    };

    const result = await fileStorage.update('decisions', decision.id, updates);

    // Update application status
    if (finalDecisionData.final_decision === 'Approved') {
      await applicationService.approve(applicationId, userId, userName);
      
      await auditService.log({
        actor_id: userId,
        actor_name: userName,
        action: auditService.ACTIONS.APPROVE_APPLICATION,
        entity_type: 'Decision',
        entity_id: decision.id,
        before: decision,
        after: result.new
      });
    } else if (finalDecisionData.final_decision === 'Rejected') {
      await applicationService.reject(applicationId, userId, userName);
      
      await auditService.log({
        actor_id: userId,
        actor_name: userName,
        action: auditService.ACTIONS.REJECT_APPLICATION,
        entity_type: 'Decision',
        entity_id: decision.id,
        before: decision,
        after: result.new
      });
    }

    return result.new;
  }

  /**
   * Get decision for an application
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object|undefined>} Decision object or undefined if not found
   */
  async getByApplication(applicationId) {
    const decisions = await fileStorage.read('decisions');
    return decisions.find(d => d.application_id === applicationId);
  }

  /**
   * Get decision by ID
   * @async
   * @param {string} id - Decision ID
   * @returns {Promise<Object>} Decision object
   * @throws {Error} If decision not found
   */
  async getById(id) {
    const decision = await fileStorage.findById('decisions', id);
    
    if (!decision) {
      throw new Error('Decision not found');
    }

    return decision;
  }

  /**
   * Add a condition to a decision
   * @async
   * @param {string} decisionId - Decision ID
   * @param {string} condition - Condition to add
   * @param {string} userId - ID of user adding condition
   * @param {string} userName - Name of user adding condition
   * @returns {Promise<Object>} Updated decision object
   * @throws {Error} If decision is finalized
   */
  async addCondition(decisionId, condition, userId, userName) {
    const decision = await this.getById(decisionId);

    if (decision.is_final) {
      throw new Error('Cannot modify finalized decision');
    }

    const conditions = [...decision.conditions, condition];
    const result = await fileStorage.update('decisions', decisionId, { conditions });

    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: 'ADD_CONDITION',
      entity_type: 'Decision',
      entity_id: decisionId,
      before: { conditions: decision.conditions },
      after: { conditions }
    });

    return result.new;
  }

  /**
   * Remove a condition from a decision
   * @async
   * @param {string} decisionId - Decision ID
   * @param {number} conditionIndex - Index of condition to remove
   * @param {string} userId - ID of user removing condition
   * @param {string} userName - Name of user removing condition
   * @returns {Promise<Object>} Updated decision object
   * @throws {Error} If decision is finalized
   */
  async removeCondition(decisionId, conditionIndex, userId, userName) {
    const decision = await this.getById(decisionId);

    if (decision.is_final) {
      throw new Error('Cannot modify finalized decision');
    }

    const conditions = decision.conditions.filter((_, index) => index !== conditionIndex);
    const result = await fileStorage.update('decisions', decisionId, { conditions });

    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: 'REMOVE_CONDITION',
      entity_type: 'Decision',
      entity_id: decisionId,
      before: { conditions: decision.conditions },
      after: { conditions }
    });

    return result.new;
  }

  /**
   * Override a finalized decision (Admin only)
   * Allows modifying finalized decisions in exceptional cases
   * @async
   * @param {string} decisionId - Decision ID
   * @param {Object} overrideData - Override data
   * @param {string} userId - ID of admin overriding
   * @param {string} userName - Name of admin overriding
   * @returns {Promise<Object>} Updated decision object
   */
  async overrideDecision(decisionId, overrideData, userId, userName) {
    const decision = await this.getById(decisionId);

    const result = await fileStorage.update('decisions', decisionId, {
      ...overrideData,
      overridden_by: userId,
      overridden_at: new Date().toISOString()
    });

    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: 'OVERRIDE_DECISION',
      entity_type: 'Decision',
      entity_id: decisionId,
      before: decision,
      after: result.new
    });

    return result.new;
  }
}

module.exports = new DecisionService();

// Made with Bob
