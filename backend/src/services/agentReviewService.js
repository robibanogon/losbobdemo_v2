/**
 * @fileoverview Agent Review Service - AI-powered application review
 * @module services/agentReviewService
 * @description Provides AI agent review functionality to check application completeness,
 * data quality, and generate recommendations based on policy rules.
 */

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const fileStorage = require('../utils/fileStorage');
const documentService = require('./documentService');
const analysisService = require('./analysisService');
const auditService = require('./auditService');
const watsonxService = require('./watsonxService');

/**
 * Agent Review Service Class
 * Performs automated review of loan applications
 * @class
 */
class AgentReviewService {
  /**
   * Load credit policy configuration
   * @async
   * @returns {Promise<Object>} Policy configuration
   */
  async loadPolicy() {
    const policyPath = path.join(__dirname, '../config/policy.json');
    const policyData = await fs.readFile(policyPath, 'utf8');
    return JSON.parse(policyData);
  }

  /**
   * Run AI agent review on an application
   * Checks completeness, data quality, and generates recommendations
   * @async
   * @param {string} applicationId - Application ID to review
   * @param {string} userId - ID of user running review
   * @param {string} userName - Name of user running review
   * @param {Object} options - Review options
   * @param {boolean} options.useAI - Use watsonx.ai for analysis (default: true if configured)
   * @param {string} options.model - AI model to use (default: llama-3-3-70b-instruct)
   * @returns {Promise<Object>} Agent review object with findings and recommendations
   * @throws {Error} If application not found
   */
  async runReview(applicationId, userId, userName, options = {}) {
    const application = await fileStorage.findById('applications', applicationId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    const policy = await this.loadPolicy();
    
    // Get documents
    const documents = await documentService.getByApplication(applicationId);
    const missingDocs = await documentService.getMissingDocuments(applicationId);
    
    // Extract fields from documents (mock)
    const extractedFields = this.extractFieldsFromDocuments(documents);
    
    // Get or create analysis
    let analysis = await analysisService.getByApplication(applicationId);
    if (!analysis) {
      analysis = await analysisService.create(applicationId, userId, userName);
    }
    
    // Determine if we should use AI
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();
    const model = options.model || 'llama-3-3-70b-instruct';
    
    let review;
    
    if (useAI) {
      // Use watsonx.ai for intelligent analysis
      console.log(`Using watsonx.ai model: ${model}`);
      try {
        const aiAnalysis = await watsonxService.analyzeLoanApplication(
          application,
          analysis,
          documents,
          missingDocs,
          policy,
          model
        );
        
        review = {
          id: uuidv4(),
          application_id: applicationId,
          extracted_fields: extractedFields,
          missing_documents: missingDocs,
          data_quality_warnings: aiAnalysis.data_quality_warnings,
          risk_flags: aiAnalysis.risk_flags,
          recommended_decision: aiAnalysis.recommended_decision,
          recommendation_reason: aiAnalysis.recommendation_reason,
          recommended_conditions: aiAnalysis.recommended_conditions,
          key_strengths: aiAnalysis.key_strengths,
          key_concerns: aiAnalysis.key_concerns,
          overall_assessment: aiAnalysis.overall_assessment,
          ai_powered: true,
          ai_model: model,
          ai_metadata: aiAnalysis.aiMetadata,
          created_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId
        };
      } catch (error) {
        console.error('AI analysis failed, falling back to rule-based:', error.message);
        // Fallback to rule-based analysis
        review = await this.runRuleBasedReview(
          applicationId,
          application,
          analysis,
          documents,
          missingDocs,
          extractedFields,
          policy,
          userId
        );
        review.ai_powered = false;
        review.ai_error = error.message;
      }
    } else {
      // Use traditional rule-based analysis
      console.log('Using rule-based analysis');
      review = await this.runRuleBasedReview(
        applicationId,
        application,
        analysis,
        documents,
        missingDocs,
        extractedFields,
        policy,
        userId
      );
      review.ai_powered = false;
    }

    // Store the review
    await fileStorage.append('agent_reviews', review);

    // Log review
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.RUN_AGENT_REVIEW,
      entity_type: 'Application',
      entity_id: applicationId,
      after: review
    });

    return review;
  }

  /**
   * Run traditional rule-based review
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Array} documents - Array of document objects
   * @param {Array} missingDocs - Array of missing document types
   * @param {Object} extractedFields - Extracted fields from documents
   * @param {Object} policy - Policy configuration
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Rule-based review object
   */
  async runRuleBasedReview(applicationId, application, analysis, documents, missingDocs, extractedFields, policy, userId) {
    // Check data quality
    const dataQualityWarnings = this.checkDataQuality(application, extractedFields);
    
    // Generate risk flags (top 3-5)
    const riskFlags = analysis.flags.slice(0, 5);
    
    // Make recommendation
    const recommendation = this.makeRecommendation(application, analysis, policy, missingDocs);
    
    return {
      id: uuidv4(),
      application_id: applicationId,
      extracted_fields: extractedFields,
      missing_documents: missingDocs,
      data_quality_warnings: dataQualityWarnings,
      risk_flags: riskFlags,
      recommended_decision: recommendation.decision,
      recommendation_reason: recommendation.reason,
      recommended_conditions: recommendation.conditions,
      created_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId
    };
  }

  /**
   * Get the most recent agent review for an application
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object|null>} Most recent review or null if none exists
   */
  async getReview(applicationId) {
    const reviews = await fileStorage.read('agent_reviews');
    // Get the most recent review for this application
    const appReviews = reviews.filter(r => r.application_id === applicationId);
    
    if (appReviews.length === 0) {
      return null;
    }
    
    // Return the most recent review
    return appReviews.sort((a, b) =>
      new Date(b.reviewed_at) - new Date(a.reviewed_at)
    )[0];
  }

  /**
   * Extract fields from uploaded documents
   * @param {Array} documents - Array of document objects
   * @returns {Object} Extracted fields organized by document type
   */
  extractFieldsFromDocuments(documents) {
    const extracted = {};
    
    documents.forEach(doc => {
      if (doc.extracted_fields && Object.keys(doc.extracted_fields).length > 0) {
        extracted[doc.doc_type] = doc.extracted_fields;
      }
    });
    
    return extracted;
  }

  /**
   * Check data quality and identify warnings
   * Validates application data for inconsistencies and issues
   * @param {Object} application - Application object
   * @param {Object} extractedFields - Extracted fields from documents
   * @returns {Array} Array of data quality warnings
   */
  checkDataQuality(application, extractedFields) {
    const warnings = [];
    
    // Check for negative values
    if (application.financial_snapshot.monthly_revenue < 0) {
      warnings.push({
        field: 'monthly_revenue',
        severity: 'High',
        message: 'Monthly revenue cannot be negative'
      });
    }
    
    if (application.financial_snapshot.monthly_expenses < 0) {
      warnings.push({
        field: 'monthly_expenses',
        severity: 'High',
        message: 'Monthly expenses cannot be negative'
      });
    }
    
    // Check if expenses exceed revenue
    if (application.financial_snapshot.monthly_expenses > application.financial_snapshot.monthly_revenue) {
      warnings.push({
        field: 'financial_snapshot',
        severity: 'Medium',
        message: 'Monthly expenses exceed monthly revenue - negative cashflow'
      });
    }
    
    // Check collateral value vs loan amount
    if (application.collateral.estimated_value < application.loan_request.amount) {
      warnings.push({
        field: 'collateral',
        severity: 'Medium',
        message: 'Collateral value is less than loan amount'
      });
    }
    
    // Check if loan amount is reasonable
    if (application.loan_request.amount > application.financial_snapshot.monthly_revenue * 12) {
      warnings.push({
        field: 'loan_amount',
        severity: 'Medium',
        message: 'Loan amount exceeds annual revenue'
      });
    }
    
    // Check tenor
    if (application.loan_request.tenor_months < 6 || application.loan_request.tenor_months > 60) {
      warnings.push({
        field: 'tenor',
        severity: 'Low',
        message: 'Unusual loan tenor (typically 6-60 months)'
      });
    }
    
    // Check years in business
    if (application.applicant.years_in_business < 1) {
      warnings.push({
        field: 'years_in_business',
        severity: 'High',
        message: 'Business has less than 1 year of operating history'
      });
    }
    
    // Check credit score range
    if (application.owner_info.credit_score < 300 || application.owner_info.credit_score > 850) {
      warnings.push({
        field: 'credit_score',
        severity: 'High',
        message: 'Credit score outside valid range (300-850)'
      });
    }
    
    return warnings;
  }

  /**
   * Generate recommendation based on policy rules
   * Evaluates application against policy thresholds
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Object} policy - Policy configuration
   * @param {Array} missingDocs - Array of missing document types
   * @returns {Object} Recommendation with decision, reason, and conditions
   */
  makeRecommendation(application, analysis, policy, missingDocs) {
    const thresholds = policy.thresholds;
    const reasons = [];
    let decision = 'Approve';
    
    // Check if documents are complete
    if (missingDocs.length > 0) {
      decision = 'Review';
      reasons.push(`Missing required documents: ${missingDocs.join(', ')}`);
    }
    
    // Check critical thresholds
    if (analysis.dscr < thresholds.minDSCR) {
      decision = 'Reject';
      reasons.push(`DSCR of ${analysis.dscr.toFixed(2)} is below minimum ${thresholds.minDSCR}`);
    }
    
    if (application.owner_info.credit_score < thresholds.minCreditScore) {
      decision = 'Reject';
      reasons.push(`Credit score of ${application.owner_info.credit_score} is below minimum ${thresholds.minCreditScore}`);
    }
    
    if (application.applicant.years_in_business < thresholds.minYearsInBusiness) {
      if (decision === 'Approve') decision = 'Review';
      reasons.push(`Only ${application.applicant.years_in_business} years in business (minimum ${thresholds.minYearsInBusiness})`);
    }
    
    if (application.loan_request.amount > thresholds.maxLoanAmount) {
      decision = 'Reject';
      reasons.push(`Loan amount ₱${application.loan_request.amount.toLocaleString()} exceeds maximum ₱${thresholds.maxLoanAmount.toLocaleString()}`);
    }
    
    // Check collateral coverage
    if (analysis.collateral_coverage < thresholds.minCollateralCoverage) {
      if (decision === 'Approve') decision = 'Review';
      reasons.push(`Collateral coverage of ${analysis.collateral_coverage.toFixed(0)}% is below minimum ${thresholds.minCollateralCoverage}%`);
    }
    
    // Check risk score
    if (analysis.risk_score < 50) {
      if (decision === 'Approve') decision = 'Review';
      reasons.push(`Risk score of ${analysis.risk_score} indicates elevated risk`);
    }
    
    // Generate conditions
    const conditions = this.generateConditions(application, analysis, policy, decision);
    
    // If no issues found
    if (reasons.length === 0) {
      reasons.push('All criteria met. Application meets policy requirements.');
    }
    
    return {
      decision,
      reason: reasons.join('; '),
      conditions
    };
  }

  /**
   * Generate approval conditions based on risk factors
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Object} policy - Policy configuration
   * @param {string} decision - Recommended decision
   * @returns {Array} Array of condition objects
   */
  generateConditions(application, analysis, policy, decision) {
    const conditions = [];
    
    if (decision === 'Approve' || decision === 'Review') {
      // Add standard conditions
      conditions.push(...policy.standardConditions);
      
      // Add specific conditions based on analysis
      if (analysis.collateral_coverage < 150) {
        conditions.push({
          condition: 'Additional collateral or personal guarantee required',
          type: 'Pre-disbursement'
        });
      }
      
      if (analysis.dscr < 1.5) {
        conditions.push({
          condition: 'Monthly monitoring of cashflow for first 6 months',
          type: 'Post-disbursement'
        });
      }
      
      if (application.applicant.years_in_business < 5) {
        conditions.push({
          condition: 'Quarterly business performance review',
          type: 'Post-disbursement'
        });
      }
      
      if (application.loan_request.amount > 200000) {
        conditions.push({
          condition: 'Site visit and business verification',
          type: 'Pre-disbursement'
        });
      }
    }
    
    return conditions;
  }
}

module.exports = new AgentReviewService();

// Made with Bob
