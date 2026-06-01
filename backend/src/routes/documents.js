/**
 * @fileoverview Document Routes
 * @module routes/documents
 * @description Provides endpoints for document retrieval, download, and deletion
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const documentService = require('../services/documentService');
const ibmCosService = require('../services/ibmCosService');
const { authenticate } = require('../middleware/auth');

/**
 * Get document metadata by ID
 * @route GET /api/documents/:id
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @returns {Object} Document object
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await documentService.getById(req.params.id);
    res.json(document);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * Download document file
 * @route GET /api/documents/:id/download
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @returns {File} Document file download or presigned URL
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const document = await documentService.getById(req.params.id);
    
    // Check if document has COS key (stored in IBM COS)
    if (document.cos_key && ibmCosService.isConfigured()) {
      // Stream file from COS
      try {
        const params = {
          Bucket: ibmCosService.bucketName,
          Key: document.cos_key
        };
        
        const cosObject = await ibmCosService.cosClient.getObject(params).promise();
        
        // Set headers for file download
        res.setHeader('Content-Type', document.mime_type || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
        res.setHeader('Content-Length', cosObject.ContentLength);
        
        // Send file content
        res.send(cosObject.Body);
      } catch (cosError) {
        console.error('COS download error:', cosError);
        res.status(500).json({
          error: 'Failed to download from Cloud Object Storage',
          message: cosError.message
        });
      }
    } else {
      // Fallback to local file system
      const fs = require('fs');
      if (fs.existsSync(document.storage_path)) {
        res.download(document.storage_path, document.original_filename);
      } else {
        res.status(404).json({
          error: 'Document file not found',
          message: 'The document file is not available. It may need to be uploaded to IBM Cloud Object Storage.'
        });
      }
    }
  } catch (error) {
    console.error('Document download error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Delete a document
 * Removes both metadata and physical file
 * @route DELETE /api/documents/:id
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @returns {Object} Success message
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await documentService.delete(req.params.id, req.user.id, req.user.name);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Analyze document quality using AI
 * @route POST /api/documents/:id/analyze-quality
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @param {string} model - AI model to use (optional, body param)
 * @returns {Object} Quality analysis results
 */
router.post('/:id/analyze-quality', authenticate, async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - POST /api/documents/${req.params.id}/analyze-quality`);
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model
    };
    
    const analysis = await documentService.analyzeDocumentQuality(req.params.id, options);
    res.json(analysis);
  } catch (error) {
    console.error('Document quality analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Extract fields from document using AI
 * @route POST /api/documents/:id/extract-fields
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @param {string} documentContent - Document content for extraction (body param)
 * @param {string} model - AI model to use (optional, body param)
 * @returns {Object} Extracted fields
 */
router.post('/:id/extract-fields', authenticate, async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - POST /api/documents/${req.params.id}/extract-fields`);
    
    const document = await documentService.getById(req.params.id);
    const documentContent = req.body.documentContent || `Document type: ${document.doc_type}, Filename: ${document.original_filename}`;
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model
    };
    
    const extractedFields = await documentService.aiExtractFields(
      document.doc_type,
      documentContent,
      options
    );
    
    res.json(extractedFields);
  } catch (error) {
    console.error('Field extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Classify document type using AI
 * @route POST /api/documents/classify
 * @access Private
 * @param {string} documentContent - Document content for classification (body param)
 * @param {string} model - AI model to use (optional, body param)
 * @returns {Object} Classification results
 */
router.post('/classify', authenticate, async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - POST /api/documents/classify`);
    
    if (!req.body.documentContent) {
      return res.status(400).json({ error: 'documentContent is required' });
    }
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model
    };
    
    const classification = await documentService.classifyDocument(
      req.body.documentContent,
      options
    );
    
    res.json(classification);
  } catch (error) {
    console.error('Document classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Perform comprehensive document intelligence analysis
 * @route POST /api/documents/:id/intelligence
 * @access Private
 * @param {string} id - Document ID (URL param)
 * @param {string} documentContent - Document content (optional, body param)
 * @param {string} model - AI model to use (optional, body param)
 * @returns {Object} Comprehensive intelligence analysis
 */
router.post('/:id/intelligence', authenticate, async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - POST /api/documents/${req.params.id}/intelligence`);
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model,
      documentContent: req.body.documentContent
    };
    
    const intelligence = await documentService.performDocumentIntelligence(
      req.params.id,
      options
    );
    
    res.json(intelligence);
  } catch (error) {
    console.error('Document intelligence error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch analyze all documents for an application
 * @route POST /api/documents/batch-analyze/:applicationId
 * @access Private
 * @param {string} applicationId - Application ID (URL param)
 * @param {string} model - AI model to use (optional, body param)
 * @returns {Object} Batch analysis results
 */
router.post('/batch-analyze/:applicationId', authenticate, async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - POST /api/documents/batch-analyze/${req.params.applicationId}`);
    
    const options = {
      useAI: req.body.useAI,
      model: req.body.model
    };
    
    const batchResults = await documentService.batchAnalyzeDocuments(
      req.params.applicationId,
      options
    );
    
    res.json(batchResults);
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Made with Bob
