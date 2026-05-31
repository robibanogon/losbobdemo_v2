/**
 * @fileoverview Document Service - Document upload and management
 * @module services/documentService
 * @description Handles document uploads, storage, field extraction,
 * and document checklist management for loan applications.
 * Enhanced with AI-powered document intelligence using watsonx.ai
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const fileStorage = require('../utils/fileStorage');
const auditService = require('./auditService');
const watsonxService = require('./watsonxService');

/**
 * Document Service Class
 * Manages document uploads, storage, and checklist tracking
 * @class
 */
class DocumentService {
  /**
   * Create DocumentService instance
   * Initializes uploads directory path
   */
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../data/uploads');
  }

  /**
   * Ensure uploads directory exists
   * Creates directory if it doesn't exist
   * @async
   * @private
   */
  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Create a new document record
   * @async
   * @param {Object} documentData - Document information
   * @param {string} documentData.application_id - Application ID
   * @param {string} documentData.doc_type - Document type
   * @param {string} documentData.filename - Stored filename
   * @param {string} documentData.original_filename - Original filename
   * @param {string} documentData.storage_path - File storage path
   * @param {number} documentData.file_size - File size in bytes
   * @param {string} documentData.mime_type - MIME type
   * @param {Object} [documentData.extracted_fields] - Extracted fields from document
   * @param {string} userId - ID of user uploading
   * @param {string} userName - Name of user uploading
   * @returns {Promise<Object>} Created document object
   */
  async create(documentData, userId, userName) {
    await this.ensureUploadsDir();

    const document = {
      id: uuidv4(),
      application_id: documentData.application_id,
      doc_type: documentData.doc_type,
      filename: documentData.filename,
      original_filename: documentData.original_filename,
      storage_path: documentData.storage_path,
      file_size: documentData.file_size,
      mime_type: documentData.mime_type,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      extracted_fields: documentData.extracted_fields || {}
    };

    await fileStorage.append('documents', document);

    // Log upload
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.UPLOAD_DOCUMENT,
      entity_type: 'Document',
      entity_id: document.id,
      after: document
    });

    return document;
  }

  /**
   * Get all documents for an application
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Array of document objects
   */
  async getByApplication(applicationId) {
    const documents = await fileStorage.read('documents');
    return documents.filter(doc => doc.application_id === applicationId);
  }

  /**
   * Get a document by ID
   * @async
   * @param {string} id - Document ID
   * @returns {Promise<Object>} Document object
   * @throws {Error} If document not found
   */
  async getById(id) {
    const document = await fileStorage.findById('documents', id);
    
    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  }

  /**
   * Delete a document
   * Removes both database record and physical file
   * @async
   * @param {string} id - Document ID
   * @param {string} userId - ID of user deleting
   * @param {string} userName - Name of user deleting
   * @returns {Promise<boolean>} True if deletion successful
   */
  async delete(id, userId, userName) {
    const document = await this.getById(id);

    // Delete physical file
    try {
      await fs.unlink(document.storage_path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    await fileStorage.delete('documents', id);

    // Log deletion
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: auditService.ACTIONS.DELETE_DOCUMENT,
      entity_type: 'Document',
      entity_id: id,
      before: document
    });

    return true;
  }

  /**
   * Update extracted fields for a document
   * @async
   * @param {string} id - Document ID
   * @param {Object} extractedFields - Extracted field data
   * @param {string} userId - ID of user updating
   * @param {string} userName - Name of user updating
   * @returns {Promise<Object>} Updated document object
   */
  async updateExtractedFields(id, extractedFields, userId, userName) {
    const result = await fileStorage.update('documents', id, {
      extracted_fields: extractedFields
    });

    // Log update
    await auditService.log({
      actor_id: userId,
      actor_name: userName,
      action: 'UPDATE_DOCUMENT_FIELDS',
      entity_type: 'Document',
      entity_id: id,
      before: { extracted_fields: result.old.extracted_fields },
      after: { extracted_fields: extractedFields }
    });

    return result.new;
  }

  /**
   * Get list of required document types from policy
   * @async
   * @returns {Promise<Array>} Array of required document types
   */
  async getRequiredDocuments() {
    const policyPath = path.join(__dirname, '../config/policy.json');
    const policyData = await fs.readFile(policyPath, 'utf8');
    const policy = JSON.parse(policyData);
    return policy.requiredDocuments;
  }

  /**
   * Get document checklist with completion status
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} Checklist with completion percentage
   */
  async getDocumentChecklist(applicationId) {
    const requiredDocs = await this.getRequiredDocuments();
    const uploadedDocs = await this.getByApplication(applicationId);

    const checklist = requiredDocs.map(docType => {
      const uploaded = uploadedDocs.filter(doc => doc.doc_type === docType);
      return {
        doc_type: docType,
        required: true,
        uploaded: uploaded.length > 0,
        count: uploaded.length,
        documents: uploaded
      };
    });

    const totalRequired = requiredDocs.length;
    const totalUploaded = checklist.filter(item => item.uploaded).length;
    const completionPercentage = Math.round((totalUploaded / totalRequired) * 100);

    return {
      checklist,
      total_required: totalRequired,
      total_uploaded: totalUploaded,
      completion_percentage: completionPercentage,
      is_complete: totalUploaded === totalRequired
    };
  }

  /**
   * Get list of missing required documents
   * @async
   * @param {string} applicationId - Application ID
   * @returns {Promise<Array>} Array of missing document types
   */
  async getMissingDocuments(applicationId) {
    const checklist = await this.getDocumentChecklist(applicationId);
    return checklist.checklist
      .filter(item => !item.uploaded)
      .map(item => item.doc_type);
  }

  /**
   * Mock document field extraction
   * Simulates OCR/parsing of document fields
   * @param {string} docType - Document type
   * @param {string} filename - Document filename
   * @returns {Object} Extracted fields object
   */
  mockExtractFields(docType, filename) {
    const fields = {};

    switch (docType) {
      case 'Bank Statement':
        fields.total_credits = Math.floor(Math.random() * 500000) + 100000;
        fields.total_debits = Math.floor(Math.random() * 400000) + 80000;
        fields.ending_balance = Math.floor(Math.random() * 200000) + 50000;
        fields.statement_period = '3 months';
        fields.average_monthly_balance = Math.floor(fields.ending_balance * 0.8);
        break;

      case 'Financial Statement':
        fields.total_revenue = Math.floor(Math.random() * 1000000) + 200000;
        fields.total_expenses = Math.floor(Math.random() * 800000) + 150000;
        fields.net_income = fields.total_revenue - fields.total_expenses;
        fields.total_assets = Math.floor(Math.random() * 2000000) + 500000;
        fields.total_liabilities = Math.floor(Math.random() * 1000000) + 200000;
        fields.period = 'Annual';
        break;

      case 'ID/KYC':
        fields.id_type = 'Government ID';
        fields.id_number = 'XXXX-XXXX-XXXX';
        fields.name_on_id = 'Verified';
        fields.expiry_date = '2028-12-31';
        break;

      case 'Collateral Proof':
        fields.property_type = 'Real Estate';
        fields.assessed_value = Math.floor(Math.random() * 5000000) + 1000000;
        fields.location = 'Metro Manila';
        fields.title_number = 'TCT-XXXXX';
        break;

      default:
        fields.extracted = true;
        fields.notes = 'Document received';
    }

    return fields;
  }

  /**
   * Extract fields from document using AI
   * @async
   * @param {string} docType - Document type
   * @param {string} documentContent - Document content or description
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Extracted fields with AI metadata
   */
  async aiExtractFields(docType, documentContent, options = {}) {
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();
    
    if (!useAI) {
      // Fall back to mock extraction
      return {
        extracted_fields: this.mockExtractFields(docType, documentContent),
        ai_powered: false,
        extraction_method: 'mock'
      };
    }

    try {
      console.log(`Using AI to extract fields from ${docType}...`);
      const result = await watsonxService.extractDocumentFields(
        docType,
        documentContent,
        options.model || 'llama-3-3-70b-instruct'
      );

      return {
        ...result.extracted_fields,
        ai_powered: true,
        extraction_method: 'watsonx_ai',
        ai_metadata: result.aiMetadata
      };
    } catch (error) {
      console.error('AI extraction failed, falling back to mock:', error.message);
      return {
        extracted_fields: this.mockExtractFields(docType, documentContent),
        ai_powered: false,
        extraction_method: 'mock_fallback',
        ai_error: error.message
      };
    }
  }

  /**
   * Analyze document quality using AI
   * @async
   * @param {string} id - Document ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Quality analysis results
   */
  async analyzeDocumentQuality(id, options = {}) {
    const document = await this.getById(id);
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();

    if (!useAI) {
      return {
        document_id: id,
        completeness_score: 85,
        quality_score: 85,
        missing_fields: [],
        quality_issues: [],
        recommendations: ['AI analysis not available - using default assessment'],
        overall_assessment: 'Document appears complete based on basic checks',
        ai_powered: false
      };
    }

    try {
      console.log(`Analyzing quality of document ${id} using AI...`);
      const result = await watsonxService.analyzeDocumentQuality(
        document.doc_type,
        document.extracted_fields,
        options.model || 'llama-3-3-70b-instruct'
      );

      return {
        document_id: id,
        ...result,
        ai_powered: true
      };
    } catch (error) {
      console.error('AI quality analysis failed:', error.message);
      return {
        document_id: id,
        completeness_score: 0,
        quality_score: 0,
        missing_fields: [],
        quality_issues: [{
          field: 'AI_ANALYSIS',
          issue: 'AI analysis failed',
          severity: 'High'
        }],
        recommendations: ['Manual review required - AI analysis failed'],
        overall_assessment: 'Unable to assess quality automatically',
        ai_powered: false,
        ai_error: error.message
      };
    }
  }

  /**
   * Classify document type using AI
   * @async
   * @param {string} documentContent - Document content or description
   * @param {Object} options - Classification options
   * @returns {Promise<Object>} Classification results
   */
  async classifyDocument(documentContent, options = {}) {
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();

    if (!useAI) {
      return {
        document_type: 'Other',
        confidence: 50,
        reasoning: 'AI classification not available',
        ai_powered: false
      };
    }

    try {
      console.log('Classifying document using AI...');
      const result = await watsonxService.classifyDocument(
        documentContent,
        options.model || 'llama-3-3-70b-instruct'
      );

      return {
        ...result,
        ai_powered: true
      };
    } catch (error) {
      console.error('AI classification failed:', error.message);
      return {
        document_type: 'Other',
        confidence: 0,
        reasoning: 'Classification failed - manual review required',
        ai_powered: false,
        ai_error: error.message
      };
    }
  }

  /**
   * Perform comprehensive document intelligence analysis
   * @async
   * @param {string} id - Document ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Comprehensive analysis results
   */
  async performDocumentIntelligence(id, options = {}) {
    const document = await this.getById(id);
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();

    const result = {
      document_id: id,
      document_type: document.doc_type,
      original_filename: document.original_filename,
      uploaded_at: document.uploaded_at,
      ai_powered: useAI,
      timestamp: new Date().toISOString()
    };

    if (!useAI) {
      result.field_extraction = {
        extracted_fields: document.extracted_fields,
        extraction_method: 'existing'
      };
      result.quality_analysis = {
        completeness_score: 85,
        quality_score: 85,
        overall_assessment: 'AI analysis not available'
      };
      return result;
    }

    try {
      // Perform quality analysis
      const qualityAnalysis = await this.analyzeDocumentQuality(id, options);
      result.quality_analysis = qualityAnalysis;

      // If document content is provided, perform field extraction
      if (options.documentContent) {
        const fieldExtraction = await this.aiExtractFields(
          document.doc_type,
          options.documentContent,
          options
        );
        result.field_extraction = fieldExtraction;
      }

      result.success = true;
      return result;
    } catch (error) {
      console.error('Document intelligence analysis failed:', error.message);
      result.success = false;
      result.error = error.message;
      return result;
    }
  }

  /**
   * Batch analyze multiple documents
   * @async
   * @param {string} applicationId - Application ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Batch analysis results
   */
  async batchAnalyzeDocuments(applicationId, options = {}) {
    const documents = await this.getByApplication(applicationId);
    const useAI = options.useAI !== undefined ? options.useAI : watsonxService.isConfigured();

    const results = {
      application_id: applicationId,
      total_documents: documents.length,
      ai_powered: useAI,
      documents: [],
      summary: {
        avg_completeness: 0,
        avg_quality: 0,
        total_issues: 0,
        critical_issues: 0
      },
      timestamp: new Date().toISOString()
    };

    let totalCompleteness = 0;
    let totalQuality = 0;
    let totalIssues = 0;
    let criticalIssues = 0;

    for (const doc of documents) {
      try {
        const analysis = await this.analyzeDocumentQuality(doc.id, options);
        
        results.documents.push({
          document_id: doc.id,
          doc_type: doc.doc_type,
          filename: doc.original_filename,
          analysis: analysis
        });

        totalCompleteness += analysis.completeness_score || 0;
        totalQuality += analysis.quality_score || 0;
        totalIssues += (analysis.quality_issues || []).length;
        criticalIssues += (analysis.quality_issues || []).filter(
          issue => issue.severity === 'High'
        ).length;
      } catch (error) {
        console.error(`Failed to analyze document ${doc.id}:`, error.message);
        results.documents.push({
          document_id: doc.id,
          doc_type: doc.doc_type,
          filename: doc.original_filename,
          error: error.message
        });
      }
    }

    if (documents.length > 0) {
      results.summary.avg_completeness = Math.round(totalCompleteness / documents.length);
      results.summary.avg_quality = Math.round(totalQuality / documents.length);
      results.summary.total_issues = totalIssues;
      results.summary.critical_issues = criticalIssues;
    }

    return results;
  }
}

module.exports = new DocumentService();

// Made with Bob
