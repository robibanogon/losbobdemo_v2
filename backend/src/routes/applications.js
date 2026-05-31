/**
 * @fileoverview Application Routes - RESTful API endpoints for loan applications
 * @module routes/applications
 * @description Provides comprehensive API endpoints for managing loan applications,
 * including CRUD operations, document uploads, credit analysis, agent reviews,
 * decision workflows, and audit logging.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const applicationService = require('../services/applicationService');
const documentService = require('../services/documentService');
const analysisService = require('../services/analysisService');
const agentReviewService = require('../services/agentReviewService');
const decisionService = require('../services/decisionService');
const memoService = require('../services/memoService');
const auditService = require('../services/auditService');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Configure multer for file uploads
 * Stores files in data/uploads directory with unique names
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../data/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

/**
 * Multer upload configuration
 * - Max file size: 10MB
 * - Allowed types: PDF, JPG, PNG, DOCX, DOC
 */
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|docx|doc/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, PNG, and DOCX files are allowed'));
  }
});

/**
 * Validation middleware for application creation/update
 * Validates all required fields and data types
 */
const validateApplication = [
  body('applicant.legal_name').notEmpty().withMessage('Legal name is required'),
  body('applicant.business_type').notEmpty().withMessage('Business type is required'),
  body('applicant.industry').notEmpty().withMessage('Industry is required'),
  body('applicant.years_in_business').isNumeric().withMessage('Years in business must be a number'),
  body('loan_request.amount').isNumeric().withMessage('Loan amount must be a number'),
  body('loan_request.tenor_months').isNumeric().withMessage('Tenor must be a number'),
  body('loan_request.purpose').notEmpty().withMessage('Loan purpose is required'),
  body('financial_snapshot.monthly_revenue').isNumeric().withMessage('Monthly revenue must be a number'),
  body('financial_snapshot.monthly_expenses').isNumeric().withMessage('Monthly expenses must be a number'),
  body('collateral.estimated_value').isNumeric().withMessage('Collateral value must be a number'),
  body('owner_info.credit_score').isNumeric().withMessage('Credit score must be a number')
];

/**
 * Get all applications with optional filtering
 * @route GET /api/applications
 * @access Private - All authenticated users
 * @param {string} [status] - Filter by status (query param)
 * @param {string} [owner_user_id] - Filter by owner (query param)
 * @param {string} [search] - Search by name or number (query param)
 * @returns {Array} Array of application objects
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      owner_user_id: req.query.owner_user_id,
      search: req.query.search
    };

    const applications = await applicationService.getAll(filters);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get application statistics
 * @route GET /api/applications/statistics
 * @access Private - All authenticated users
 * @returns {Object} Statistics including counts by status and amounts
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const stats = await applicationService.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single application by ID
 * @route GET /api/applications/:id
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Application object
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const application = await applicationService.getById(req.params.id);
    res.json(application);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Create new application
 * @route POST /api/applications
 * @access Private - RM and Admin only
 * @param {Object} body - Application data (see validateApplication middleware)
 * @returns {Object} Created application object
 */
router.post('/', authenticate, authorize('RM', 'Admin'), validateApplication, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const application = await applicationService.create(
      req.body,
      req.user.id,
      req.user.name
    );
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update application
 * @route PUT /api/applications/:id
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @param {Object} body - Fields to update
 * @returns {Object} Updated application object
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const application = await applicationService.update(
      req.params.id,
      req.body,
      req.user.id,
      req.user.name
    );
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete application
 * @route DELETE /api/applications/:id
 * @access Private - RM and Admin only
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Success message
 */
router.delete('/:id', authenticate, authorize('RM', 'Admin'), async (req, res) => {
  try {
    await applicationService.delete(req.params.id, req.user.id, req.user.name);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Submit application (Draft -> Submitted)
 * @route POST /api/applications/:id/submit
 * @access Private - RM and Admin only
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Updated application object
 */
router.post('/:id/submit', authenticate, authorize('RM', 'Admin'), async (req, res) => {
  try {
    const application = await applicationService.submit(
      req.params.id,
      req.user.id,
      req.user.name
    );
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Complete application (Approved -> Completed)
 * @route POST /api/applications/:id/complete
 * @access Private - Approver and Admin only
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Updated application object
 */
router.post('/:id/complete', authenticate, authorize('Approver', 'Admin'), async (req, res) => {
  try {
    const application = await applicationService.complete(
      req.params.id,
      req.user.id,
      req.user.name
    );
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update application status (generic)
 * @route POST /api/applications/:id/status
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @param {string} status - New status (body param)
 * @returns {Object} Updated application object
 */
router.post('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const application = await applicationService.updateStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.name
    );
    
    res.json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all documents for an application
 * @route GET /api/applications/:id/documents
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Array} Array of document objects
 */
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const documents = await documentService.getByApplication(req.params.id);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get document checklist for an application
 * @route GET /api/applications/:id/documents/checklist
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Document checklist with completion status
 */
router.get('/:id/documents/checklist', authenticate, async (req, res) => {
  try {
    const checklist = await documentService.getDocumentChecklist(req.params.id);
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Upload document for an application
 * @route POST /api/applications/:id/documents
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @param {File} file - Document file (multipart/form-data)
 * @param {string} doc_type - Document type (body param)
 * @returns {Object} Created document object with extracted fields
 */
router.post('/:id/documents', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { doc_type } = req.body;
    
    if (!doc_type) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Mock extract fields
    const extractedFields = documentService.mockExtractFields(doc_type, req.file.originalname);

    const document = await documentService.create(
      {
        application_id: req.params.id,
        doc_type,
        filename: req.file.filename,
        original_filename: req.file.originalname,
        storage_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        extracted_fields: extractedFields
      },
      req.user.id,
      req.user.name
    );

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get agent review for an application
 * @route GET /api/applications/:id/agent-review
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Agent review object
 */
router.get('/:id/agent-review', authenticate, async (req, res) => {
  try {
    const review = await agentReviewService.getReview(req.params.id);
    
    if (!review) {
      return res.status(404).json({ error: 'Agent review not found' });
    }
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run AI agent review on an application
 * @route POST /api/applications/:id/agent-review
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @body {boolean} useAI - Use watsonx.ai for analysis (optional)
 * @body {string} model - AI model to use: llama-3-3-70b-instruct or gpt-oss-120b (optional)
 * @returns {Object} Generated agent review object
 */
router.post('/:id/agent-review', authenticate, async (req, res) => {
  try {
    console.log(`Running agent review for application ${req.params.id}`);
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model
    };
    
    if (options.model) {
      console.log(`Using AI model: ${options.model}`);
    }
    
    const review = await agentReviewService.runReview(
      req.params.id,
      req.user.id,
      req.user.name,
      options
    );
    
    console.log('Agent review completed successfully');
    
    // Move application to "In Review" status only if it's currently "Submitted"
    const application = await applicationService.getById(req.params.id);
    if (application.status === 'Submitted') {
      console.log('Moving application to In Review status');
      await applicationService.moveToReview(req.params.id, req.user.id, req.user.name);
    }
    
    res.json(review);
  } catch (error) {
    console.error('Error running agent review:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

/**
 * Compare AI models for agent review
 * @route POST /api/applications/:id/agent-review/compare
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @body {Array<string>} models - Array of model names to compare (optional)
 * @returns {Object} Comparison results from multiple models
 */
router.post('/:id/agent-review/compare', authenticate, async (req, res) => {
  try {
    console.log(`Comparing AI models for application ${req.params.id}`);
    
    const watsonxService = require('../services/watsonxService');
    
    if (!watsonxService.isConfigured()) {
      return res.status(400).json({
        error: 'WatsonX AI is not configured. Please set WATSONX_API_KEY and WATSONX_PROJECT_ID environment variables.'
      });
    }
    
    // Get application data
    const application = await applicationService.getById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const documentService = require('../services/documentService');
    const analysisService = require('../services/analysisService');
    const policy = await agentReviewService.loadPolicy();
    
    const documents = await documentService.getByApplication(req.params.id);
    const missingDocs = await documentService.getMissingDocuments(req.params.id);
    
    let analysis = await analysisService.getByApplication(req.params.id);
    if (!analysis) {
      analysis = await analysisService.create(req.params.id, req.user.id, req.user.name);
    }
    
    // Models to compare
    const models = req.body.models || ['llama-3-3-70b-instruct', 'gpt-oss-120b'];
    
    console.log(`Comparing models: ${models.join(', ')}`);
    
    const comparison = await watsonxService.compareModels(
      application,
      analysis,
      documents,
      missingDocs,
      policy,
      models
    );
    
    res.json({
      application_id: req.params.id,
      application_number: application.application_number,
      models_compared: models,
      comparison: comparison,
      compared_at: new Date().toISOString(),
      compared_by: req.user.id
    });
  } catch (error) {
    console.error('Error comparing models:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get credit analysis for an application
 * @route GET /api/applications/:id/analysis
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Analysis object with risk metrics
 */
router.get('/:id/analysis', authenticate, async (req, res) => {
  try {
    const analysis = await analysisService.getByApplication(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create or recalculate credit analysis
 * @route POST /api/applications/:id/analysis
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} New analysis object
 */
router.post('/:id/analysis', authenticate, async (req, res) => {
  try {
    const analysis = await analysisService.recalculate(
      req.params.id,
      req.user.id,
      req.user.name
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update analysis assumptions and notes
 * @route PUT /api/applications/:id/analysis/assumptions
 * @access Private - Credit Analyst and Admin only
 * @param {string} id - Application ID (URL param)
 * @param {Object} assumptions - Updated assumptions (body param)
 * @param {string} notes - Analysis notes (body param)
 * @returns {Object} Updated analysis object
 */
router.put('/:id/analysis/assumptions', authenticate, authorize('Credit Analyst', 'Admin'), async (req, res) => {
  try {
    const analysis = await analysisService.getByApplication(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const { assumptions, notes } = req.body;
    
    const updated = await analysisService.updateAssumptions(
      analysis.id,
      assumptions,
      notes,
      req.user.id,
      req.user.name
    );
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get decision for an application
 * @route GET /api/applications/:id/decision
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Decision object
 */
router.get('/:id/decision', authenticate, async (req, res) => {
  try {
    const decision = await decisionService.getByApplication(req.params.id);
    
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit credit analyst recommendation
 * @route POST /api/applications/:id/decision/recommend
 * @access Private - Credit Analyst and Admin only
 * @param {string} id - Application ID (URL param)
 * @param {string} recommended_decision - Recommendation (Approve/Reject)
 * @param {string} recommendation_notes - Notes explaining recommendation
 * @returns {Object} Updated decision object
 */
router.post('/:id/decision/recommend', authenticate, authorize('Credit Analyst', 'Admin'), async (req, res) => {
  try {
    const { recommended_decision, recommendation_notes } = req.body;
    
    if (!recommended_decision) {
      return res.status(400).json({ error: 'Recommended decision is required' });
    }

    const decision = await decisionService.submitRecommendation(
      req.params.id,
      { recommended_decision, recommendation_notes },
      req.user.id,
      req.user.name
    );
    
    res.json(decision);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Finalize decision (approve or reject application)
 * @route POST /api/applications/:id/decision/finalize
 * @access Private - Approver and Admin only
 * @param {string} id - Application ID (URL param)
 * @param {string} final_decision - Final decision (Approved/Rejected)
 * @param {Array} conditions - Approval conditions (optional)
 * @param {string} rejection_reason - Rejection reason (required if rejected)
 * @returns {Object} Finalized decision object
 */
router.post('/:id/decision/finalize', authenticate, authorize('Approver', 'Admin'), async (req, res) => {
  try {
    const { final_decision, conditions, rejection_reason } = req.body;
    
    if (!final_decision) {
      return res.status(400).json({ error: 'Final decision is required' });
    }

    const decision = await decisionService.finalizeDecision(
      req.params.id,
      { final_decision, conditions, rejection_reason },
      req.user.id,
      req.user.name
    );
    
    res.json(decision);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate credit memo for an application
 * @route GET /api/applications/:id/memo
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Object} Generated credit memo
 */
router.get('/:id/memo', authenticate, async (req, res) => {
  try {
    const memo = await memoService.generateMemo(
      req.params.id,
      req.user.id,
      req.user.name
    );
    
    res.json(memo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get audit log for an application
 * @route GET /api/applications/:id/audit
 * @access Private - All authenticated users
 * @param {string} id - Application ID (URL param)
 * @returns {Array} Array of audit log entries
 */
router.get('/:id/audit', authenticate, async (req, res) => {
  try {
    const logs = await auditService.getByApplication(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Made with Bob
