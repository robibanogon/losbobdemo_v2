/**
 * @fileoverview Application Service - Manages loan application lifecycle
 * @module services/applicationService
 * @description Handles CRUD operations for loan applications, status transitions,
 * and business logic for application workflow management.
 */

const { v4: uuidv4 } = require('uuid');
const fileStorage = require('../utils/fileStorage');
const auditService = require('./auditService');

/**
 * Application Service Class
 * Manages the complete lifecycle of loan applications from creation to completion
 * @class
 */
class ApplicationService {
  /**
   * Application status constants
   * Defines all possible states an application can be in
   * @static
   * @readonly
   */
  static STATUS = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed'
  };

  /**
   * Valid status transitions map
   * Defines which status changes are allowed from each current status
   * @static
   * @readonly
   * @type {Object.<string, string[]>}
   */
  static TRANSITIONS = {
    'Draft': ['Submitted'],
    'Submitted': ['In Review'],
    'In Review': ['Approved', 'Rejected'],
    'Approved': ['Completed'],
    'Rejected': [],
    'Completed': []
  };

  /**
   * Generate a unique application number
   * Format: APP-YYYY-NNNN (e.g., APP-2026-0001)
   * @async
   * @returns {Promise<string>} Generated application number
   */
  async generateApplicationNumber() {
    const applications = await fileStorage.read('applications');
    const year = new Date().getFullYear();
    const count = applications.filter(app => 
      app.application_number.startsWith(`APP-${year}`)
    ).length;
    return `APP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Create a new loan application
   * @async
   * @param {Object} applicationData - Application data from form
   * @param {Object} applicationData.applicant - Applicant information
   * @param {Object} applicationData.loan_request - Loan request details
   * @param {Object} applicationData.financial_snapshot - Financial information
   * @param {Object} applicationData.collateral - Collateral details
   * @param {Object} applicationData.owner_info - Owner/guarantor information
   * @param {string} userId - ID of user creating the application
   * @param {string} userName - Name of user creating the application
   * @returns {Promise<Object>} Created application object
   */
  async create(applicationData, userId, userName) {
    const application = {
      id: uuidv4(),
      application_number: await this.generateApplicationNumber(),
      status: ApplicationService.STATUS.DRAFT,
      owner_user_id: userId,
      
      applicant: {
        legal_name: applicationData.applicant.legal_name,
        business_type: applicationData.applicant.business_type,
        industry: applicationData.applicant.industry,
        years_in_business: applicationData.applicant.years_in_business
      },
      
      loan_request: {
        amount: applicationData.loan_request.amount,
        tenor_months: applicationData.loan_request.tenor_months,
        purpose: applicationData.loan_request.purpose,
        repayment_type: applicationData.loan_request.repayment_type
      },
      
      financial_snapshot: {
        monthly_revenue: applicationData.financial_snapshot.monthly_revenue,
        monthly_expenses: applicationData.financial_snapshot.monthly_expenses,
        existing_debt_payment: applicationData.financial_snapshot.existing_debt_payment
      },
      
      collateral: {
        type: applicationData.collateral.type,
        estimated_value: applicationData.collateral.estimated_value
      },
      
      owner_info: {
        name: applicationData.owner_info.name,
        id_number: applicationData.owner_info.id_number,
        credit_score: applicationData.owner_info.credit_score
      },
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_at: null,
      completed_at: null
    };

    await fileStorage.append('applications', application);

    // Log creation
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.CREATE_APPLICATION,
      entity_type: 'Application',
      entity_id: application.id,
      after: application
    });

    return application;
  }

  /**
   * Get all applications with optional filtering
   * @async
   * @param {Object} [filters={}] - Filter criteria
   * @param {string} [filters.status] - Filter by application status
   * @param {string} [filters.owner_user_id] - Filter by owner user ID
   * @param {string} [filters.search] - Search by legal name or application number
   * @returns {Promise<Array>} Array of applications sorted by updated_at descending
   */
  async getAll(filters = {}) {
    let applications = await fileStorage.read('applications');

    if (filters.status) {
      applications = applications.filter(app => app.status === filters.status);
    }

    if (filters.owner_user_id) {
      applications = applications.filter(app => app.owner_user_id === filters.owner_user_id);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      applications = applications.filter(app => 
        app.applicant.legal_name.toLowerCase().includes(searchLower) ||
        app.application_number.toLowerCase().includes(searchLower)
      );
    }

    // Sort by updated_at descending
    return applications.sort((a, b) => 
      new Date(b.updated_at) - new Date(a.updated_at)
    );
  }

  /**
   * Get a single application by ID
   * @async
   * @param {string} id - Application ID
   * @returns {Promise<Object>} Application object
   * @throws {Error} If application not found
   */
  async getById(id) {
    const application = await fileStorage.findById('applications', id);
    
    if (!application) {
      throw new Error('Application not found');
    }

    return application;
  }

  /**
   * Update an application
   * Only Draft applications can be fully edited
   * @async
   * @param {string} id - Application ID
   * @param {Object} updates - Fields to update
   * @param {string} userId - ID of user making the update
   * @param {string} userName - Name of user making the update
   * @returns {Promise<Object>} Updated application object
   * @throws {Error} If application is not in Draft status
   */
  async update(id, updates, userId, userName) {
    const application = await this.getById(id);

    // Check if application can be edited
    if (application.status !== ApplicationService.STATUS.DRAFT) {
      throw new Error('Only Draft applications can be fully edited');
    }

    const result = await fileStorage.update('applications', id, updates);

    // Log update
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.UPDATE_APPLICATION,
      entity_type: 'Application',
      entity_id: id,
      before: result.old,
      after: result.new
    });

    return result.new;
  }

  /**
   * Delete an application
   * Only Draft applications can be deleted
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user deleting the application
   * @param {string} userName - Name of user deleting the application
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If application is not in Draft status
   */
  async delete(id, userId, userName) {
    const application = await this.getById(id);

    // Only allow deletion of Draft applications
    if (application.status !== ApplicationService.STATUS.DRAFT) {
      throw new Error('Only Draft applications can be deleted');
    }

    await fileStorage.delete('applications', id);

    // Log deletion
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.DELETE_APPLICATION,
      entity_type: 'Application',
      entity_id: id,
      before: application
    });

    return true;
  }

  /**
   * Change application status
   * Validates that the status transition is allowed
   * @async
   * @param {string} id - Application ID
   * @param {string} newStatus - New status to transition to
   * @param {string} userId - ID of user changing the status
   * @param {string} userName - Name of user changing the status
   * @returns {Promise<Object>} Updated application object
   * @throws {Error} If status transition is not allowed
   */
  async changeStatus(id, newStatus, userId, userName) {
    const application = await this.getById(id);
    const currentStatus = application.status;

    // Validate transition
    const allowedTransitions = ApplicationService.TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    const updates = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === ApplicationService.STATUS.SUBMITTED) {
      updates.submitted_at = new Date().toISOString();
    }

    if (newStatus === ApplicationService.STATUS.COMPLETED) {
      updates.completed_at = new Date().toISOString();
    }

    const result = await fileStorage.update('applications', id, updates);

    // Log status change
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: `CHANGE_STATUS_TO_${newStatus.toUpperCase().replace(' ', '_')}`,
      entity_type: 'Application',
      entity_id: id,
      before: { status: currentStatus },
      after: { status: newStatus }
    });

    return result.new;
  }

  /**
   * Submit an application (Draft -> Submitted)
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user submitting
   * @param {string} userName - Name of user submitting
   * @returns {Promise<Object>} Updated application object
   */
  async submit(id, userId, userName) {
    return this.changeStatus(id, ApplicationService.STATUS.SUBMITTED, userId, userName);
  }

  /**
   * Move application to review (Submitted -> In Review)
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user moving to review
   * @param {string} userName - Name of user moving to review
   * @returns {Promise<Object>} Updated application object
   */
  async moveToReview(id, userId, userName) {
    return this.changeStatus(id, ApplicationService.STATUS.IN_REVIEW, userId, userName);
  }

  /**
   * Approve an application (In Review -> Approved)
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user approving
   * @param {string} userName - Name of user approving
   * @returns {Promise<Object>} Updated application object
   */
  async approve(id, userId, userName) {
    return this.changeStatus(id, ApplicationService.STATUS.APPROVED, userId, userName);
  }

  /**
   * Reject an application (In Review -> Rejected)
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user rejecting
   * @param {string} userName - Name of user rejecting
   * @returns {Promise<Object>} Updated application object
   */
  async reject(id, userId, userName) {
    return this.changeStatus(id, ApplicationService.STATUS.REJECTED, userId, userName);
  }

  /**
   * Complete an application (Approved -> Completed)
   * @async
   * @param {string} id - Application ID
   * @param {string} userId - ID of user completing
   * @param {string} userName - Name of user completing
   * @returns {Promise<Object>} Updated application object
   */
  async complete(id, userId, userName) {
    return this.changeStatus(id, ApplicationService.STATUS.COMPLETED, userId, userName);
  }

  /**
   * Generic status update method
   * Accepts any valid status and delegates to changeStatus
   * @async
   * @param {string} id - Application ID
   * @param {string} status - New status
   * @param {string} userId - ID of user updating status
   * @param {string} userName - Name of user updating status
   * @returns {Promise<Object>} Updated application object
   */
  async updateStatus(id, status, userId, userName) {
    return this.changeStatus(id, status, userId, userName);
  }

  /**
   * Get application statistics
   * Calculates total count, count by status, and loan amount statistics
   * @async
   * @returns {Promise<Object>} Statistics object with counts and amounts
   */
  async getStatistics() {
    const applications = await fileStorage.read('applications');
    
    const stats = {
      total: applications.length,
      by_status: {},
      total_amount: 0,
      avg_amount: 0
    };

    // Count by status
    Object.values(ApplicationService.STATUS).forEach(status => {
      stats.by_status[status] = applications.filter(app => app.status === status).length;
    });

    // Calculate amounts
    if (applications.length > 0) {
      stats.total_amount = applications.reduce((sum, app) => sum + app.loan_request.amount, 0);
      stats.avg_amount = stats.total_amount / applications.length;
    }

    return stats;
  }
}

module.exports = new ApplicationService();

// Made with Bob
