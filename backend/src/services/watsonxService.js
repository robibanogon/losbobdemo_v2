/**
 * @fileoverview WatsonX AI Service - Integration with IBM watsonx.ai
 * @module services/watsonxService
 * @description Provides AI-powered analysis using IBM watsonx.ai models
 * Supports multiple models: granite-13b-instruct, llama-3-3-70b-instruct, gpt-oss-120b
 */

const axios = require('axios');

/**
 * WatsonX AI Service Class
 * Handles communication with IBM watsonx.ai API
 * @class
 */
class WatsonXService {
  constructor() {
    // Configuration from environment variables - trim whitespace
    this.apiKey = (process.env.WATSONX_API_KEY || '').trim();
    this.projectId = (process.env.WATSONX_PROJECT_ID || '').trim();
    this.apiUrl = (process.env.WATSONX_API_URL || 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29').trim();
    this.iamTokenUrl = 'https://iam.cloud.ibm.com/identity/token';
    
    // Cache for IAM token
    this.cachedToken = null;
    this.tokenExpiry = null;
    
    // Model configurations
    this.models = {
      'granite-13b-instruct': {
        id: 'ibm/granite-13b-instruct-v2',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 1,
        topK: 50,
        repetitionPenalty: 1.0,
        description: 'IBM Granite - Optimized for business tasks, compliance-aware'
      },
      'llama-3-3-70b-instruct': {
        id: 'meta-llama/llama-3-3-70b-instruct',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        description: 'Meta Llama 3.3 70B - Strong reasoning, multilingual'
      },
      'gpt-oss-120b': {
        id: 'ibm/gpt-oss-120b',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.95,
        topK: 50,
        repetitionPenalty: 1.0,
        description: 'IBM GPT OSS 120B - Large scale, comprehensive analysis'
      }
    };
    
    // Default model
    this.defaultModel = process.env.WATSONX_DEFAULT_MODEL || 'llama-3-3-70b-instruct';
  }

  /**
   * Check if watsonx.ai is configured
   * @returns {boolean} True if API key and project ID are set
   */
  isConfigured() {
    return !!(this.apiKey && this.projectId);
  }

  /**
   * Get IAM access token from API key
   * @async
   * @returns {Promise<string>} IAM access token
   */
  async getIAMToken() {
    // Check if we have a valid cached token
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      const response = await axios.post(
        this.iamTokenUrl,
        `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${this.apiKey}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      this.cachedToken = response.data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
      
      return this.cachedToken;
    } catch (error) {
      console.error('IAM Token Error:', error.response?.data || error.message);
      throw new Error(`Failed to get IAM token: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Get available models
   * @returns {Object} Object containing model configurations
   */
  getAvailableModels() {
    return this.models;
  }

  /**
   * Generate text using watsonx.ai
   * @async
   * @param {string} prompt - The prompt to send to the model
   * @param {string} modelName - Name of the model to use (default: llama-3-3-70b-instruct)
   * @param {Object} options - Additional generation options
   * @returns {Promise<Object>} Generated text and metadata
   */
  async generateText(prompt, modelName = this.defaultModel, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('WatsonX AI is not configured. Please set WATSONX_API_KEY and WATSONX_PROJECT_ID environment variables.');
    }

    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found. Available models: ${Object.keys(this.models).join(', ')}`);
    }

    // For instruct models, use messages format; for base models, use input format
    const isInstructModel = modelName.includes('instruct') || modelName.includes('chat');
    
    const requestBody = {
      model_id: model.id,
      project_id: this.projectId,
      parameters: {
        max_new_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature || model.temperature,
        top_p: options.topP || model.topP,
        top_k: options.topK || model.topK,
        repetition_penalty: options.repetitionPenalty || model.repetitionPenalty,
        stop_sequences: options.stopSequences || []
      }
    };
    
    // Add input or messages based on model type
    if (isInstructModel) {
      requestBody.messages = [
        {
          role: 'user',
          content: prompt
        }
      ];
    } else {
      requestBody.input = prompt;
    }

    try {
      const startTime = Date.now();
      
      // Get IAM token from API key
      const iamToken = await this.getIAMToken();
      
      // Use IAM token for authentication
      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${iamToken}`
        },
        timeout: 60000 // 60 second timeout
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Handle different response formats for messages vs input
      const result = response.data.results?.[0] || response.data.choices?.[0];
      const generatedText = result?.generated_text || result?.message?.content || '';
      const tokenCount = result?.generated_token_count || result?.usage?.completion_tokens || 0;
      const stopReason = result?.stop_reason || result?.finish_reason || 'completed';

      return {
        text: generatedText,
        model: modelName,
        modelId: model.id,
        tokensGenerated: tokenCount,
        stopReason: stopReason,
        duration: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('WatsonX AI Error:', error.response?.data || error.message);
      throw new Error(`WatsonX AI generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Analyze loan application using AI
   * @async
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Array} documents - Array of document objects
   * @param {Array} missingDocs - Array of missing document types
   * @param {Object} policy - Policy configuration
   * @param {string} modelName - Model to use for analysis
   * @returns {Promise<Object>} AI-generated review analysis
   */
  async analyzeLoanApplication(application, analysis, documents, missingDocs, policy, modelName = this.defaultModel) {
    const prompt = this.buildLoanAnalysisPrompt(application, analysis, documents, missingDocs, policy);
    
    try {
      const result = await this.generateText(prompt, modelName, {
        temperature: 0.3, // Lower temperature for more consistent financial analysis
        maxTokens: 2048
      });

      // Parse the AI response
      const parsedReview = this.parseLoanAnalysisResponse(result.text);
      
      return {
        ...parsedReview,
        aiMetadata: {
          model: result.model,
          modelId: result.modelId,
          tokensGenerated: result.tokensGenerated,
          duration: result.duration,
          timestamp: result.timestamp
        }
      };
    } catch (error) {
      console.error('AI Loan Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for loan analysis
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Array} documents - Array of document objects
   * @param {Array} missingDocs - Array of missing document types
   * @param {Object} policy - Policy configuration
   * @returns {string} Formatted prompt
   */
  buildLoanAnalysisPrompt(application, analysis, documents, missingDocs, policy) {
    return `You are an expert credit analyst reviewing a loan application. Analyze the following information and provide a comprehensive assessment.

## APPLICATION DETAILS
- Applicant: ${application.applicant.legal_name}
- Business Type: ${application.applicant.business_type}
- Industry: ${application.applicant.industry}
- Years in Business: ${application.applicant.years_in_business}

## LOAN REQUEST
- Amount: ₱${application.loan_request.amount.toLocaleString()}
- Tenor: ${application.loan_request.tenor_months} months
- Purpose: ${application.loan_request.purpose}
- Repayment Type: ${application.loan_request.repayment_type}

## FINANCIAL SNAPSHOT
- Monthly Revenue: ₱${application.financial_snapshot.monthly_revenue.toLocaleString()}
- Monthly Expenses: ₱${application.financial_snapshot.monthly_expenses.toLocaleString()}
- Existing Debt Payment: ₱${application.financial_snapshot.existing_debt_payment.toLocaleString()}
- Net Cashflow: ₱${(application.financial_snapshot.monthly_revenue - application.financial_snapshot.monthly_expenses).toLocaleString()}

## COLLATERAL
- Type: ${application.collateral.type}
- Estimated Value: ₱${application.collateral.estimated_value.toLocaleString()}

## OWNER INFORMATION
- Name: ${application.owner_info.name}
- Credit Score: ${application.owner_info.credit_score}

## CREDIT ANALYSIS
- DSCR: ${analysis.dscr.toFixed(2)}
- Risk Score: ${analysis.risk_score}/100
- Collateral Coverage: ${analysis.collateral_coverage.toFixed(2)}%

## POLICY THRESHOLDS
- Minimum DSCR: ${policy.thresholds.minDSCR}
- Minimum Credit Score: ${policy.thresholds.minCreditScore}
- Minimum Years in Business: ${policy.thresholds.minYearsInBusiness}
- Maximum Loan Amount: ₱${policy.thresholds.maxLoanAmount.toLocaleString()}
- Minimum Collateral Coverage: ${policy.thresholds.minCollateralCoverage}%

## DOCUMENTS STATUS
- Uploaded Documents: ${documents.length}
- Missing Documents: ${missingDocs.length > 0 ? missingDocs.join(', ') : 'None'}

## TASK
Provide a structured analysis in the following JSON format:

{
  "recommended_decision": "Approve|Review|Reject",
  "recommendation_reason": "Detailed explanation of the decision",
  "data_quality_warnings": [
    {
      "field": "field_name",
      "severity": "High|Medium|Low",
      "message": "Description of the issue"
    }
  ],
  "risk_flags": [
    {
      "type": "FLAG_TYPE",
      "severity": "High|Medium|Low",
      "message": "Description of the risk"
    }
  ],
  "recommended_conditions": [
    {
      "condition": "Specific condition text",
      "type": "Pre-disbursement|Post-disbursement"
    }
  ],
  "key_strengths": ["strength1", "strength2"],
  "key_concerns": ["concern1", "concern2"],
  "overall_assessment": "Brief summary of the application quality"
}

Respond ONLY with valid JSON. Be thorough but concise. Consider all policy thresholds and financial metrics.`;
  }

  /**
   * Parse AI response into structured review object
   * @param {string} responseText - Raw AI response
   * @returns {Object} Parsed review object
   */
  parseLoanAnalysisResponse(responseText) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Validate required fields
      if (!parsed.recommended_decision || !parsed.recommendation_reason) {
        throw new Error('Missing required fields in AI response');
      }
      
      // Ensure arrays exist
      return {
        recommended_decision: parsed.recommended_decision,
        recommendation_reason: parsed.recommendation_reason,
        data_quality_warnings: parsed.data_quality_warnings || [],
        risk_flags: parsed.risk_flags || [],
        recommended_conditions: parsed.recommended_conditions || [],
        key_strengths: parsed.key_strengths || [],
        key_concerns: parsed.key_concerns || [],
        overall_assessment: parsed.overall_assessment || ''
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', responseText);
      
      // Fallback: return a basic structure
      return {
        recommended_decision: 'Review',
        recommendation_reason: 'AI analysis could not be parsed. Manual review required.',
        data_quality_warnings: [],
        risk_flags: [{
          type: 'AI_PARSING_ERROR',
          severity: 'High',
          message: 'Failed to parse AI response. Manual review required.'
        }],
        recommended_conditions: [],
        key_strengths: [],
        key_concerns: ['AI analysis parsing failed'],
        overall_assessment: 'Manual review required due to AI parsing error.'
      };
    }
  }

  /**
   * Compare models by analyzing the same application
   * @async
   * @param {Object} application - Application object
   * @param {Object} analysis - Credit analysis object
   * @param {Array} documents - Array of document objects
   * @param {Array} missingDocs - Array of missing document types
   * @param {Object} policy - Policy configuration
   * @param {Array} modelNames - Array of model names to compare
   * @returns {Promise<Object>} Comparison results
   */
  async compareModels(application, analysis, documents, missingDocs, policy, modelNames = ['llama-3-3-70b-instruct', 'gpt-oss-120b']) {
    const results = {};
    
    for (const modelName of modelNames) {
      try {
        console.log(`Testing model: ${modelName}...`);
        const result = await this.analyzeLoanApplication(
          application,
          analysis,
          documents,
          missingDocs,
          policy,
          modelName
        );
        results[modelName] = {
          success: true,
          result: result,
          model: this.models[modelName]
        };
      } catch (error) {
        results[modelName] = {
          success: false,
          error: error.message,
          model: this.models[modelName]
        };
      }
    }
    
    return results;
  }

  /**
   * Extract fields from document using AI
   * @async
   * @param {string} docType - Document type
   * @param {string} documentContent - Document content or description
   * @param {string} modelName - Model to use for extraction
   * @returns {Promise<Object>} Extracted fields
   */
  async extractDocumentFields(docType, documentContent, modelName = this.defaultModel) {
    const prompt = this.buildDocumentExtractionPrompt(docType, documentContent);
    
    try {
      const result = await this.generateText(prompt, modelName, {
        temperature: 0.1, // Very low temperature for precise extraction
        maxTokens: 1024
      });

      const extractedFields = this.parseDocumentFieldsResponse(result.text, docType);
      
      return {
        ...extractedFields,
        aiMetadata: {
          model: result.model,
          modelId: result.modelId,
          tokensGenerated: result.tokensGenerated,
          duration: result.duration,
          timestamp: result.timestamp
        }
      };
    } catch (error) {
      console.error('AI Document Extraction Error:', error);
      throw error;
    }
  }

  /**
   * Analyze document quality and completeness
   * @async
   * @param {string} docType - Document type
   * @param {Object} extractedFields - Previously extracted fields
   * @param {string} modelName - Model to use for analysis
   * @returns {Promise<Object>} Document quality analysis
   */
  async analyzeDocumentQuality(docType, extractedFields, modelName = this.defaultModel) {
    const prompt = this.buildDocumentQualityPrompt(docType, extractedFields);
    
    try {
      const result = await this.generateText(prompt, modelName, {
        temperature: 0.3,
        maxTokens: 1024
      });

      const qualityAnalysis = this.parseDocumentQualityResponse(result.text);
      
      return {
        ...qualityAnalysis,
        aiMetadata: {
          model: result.model,
          modelId: result.modelId,
          tokensGenerated: result.tokensGenerated,
          duration: result.duration,
          timestamp: result.timestamp
        }
      };
    } catch (error) {
      console.error('AI Document Quality Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Classify document type using AI
   * @async
   * @param {string} documentContent - Document content or description
   * @param {string} modelName - Model to use for classification
   * @returns {Promise<Object>} Document classification result
   */
  async classifyDocument(documentContent, modelName = this.defaultModel) {
    const prompt = this.buildDocumentClassificationPrompt(documentContent);
    
    try {
      const result = await this.generateText(prompt, modelName, {
        temperature: 0.2,
        maxTokens: 512
      });

      const classification = this.parseDocumentClassificationResponse(result.text);
      
      return {
        ...classification,
        aiMetadata: {
          model: result.model,
          modelId: result.modelId,
          tokensGenerated: result.tokensGenerated,
          duration: result.duration,
          timestamp: result.timestamp
        }
      };
    } catch (error) {
      console.error('AI Document Classification Error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for document field extraction
   * @param {string} docType - Document type
   * @param {string} documentContent - Document content
   * @returns {string} Formatted prompt
   */
  buildDocumentExtractionPrompt(docType, documentContent) {
    const fieldTemplates = {
      'Bank Statement': ['total_credits', 'total_debits', 'ending_balance', 'statement_period', 'average_monthly_balance', 'account_number', 'bank_name'],
      'Financial Statement': ['total_revenue', 'total_expenses', 'net_income', 'total_assets', 'total_liabilities', 'equity', 'period', 'company_name'],
      'ID/KYC': ['id_type', 'id_number', 'name_on_id', 'date_of_birth', 'expiry_date', 'issuing_authority'],
      'Collateral Proof': ['property_type', 'assessed_value', 'location', 'title_number', 'owner_name', 'property_size'],
      'Business Registration': ['business_name', 'registration_number', 'registration_date', 'business_type', 'registered_address'],
      'Tax Return': ['tax_year', 'gross_income', 'taxable_income', 'tax_paid', 'taxpayer_id']
    };

    const expectedFields = fieldTemplates[docType] || ['extracted_data'];

    return `You are a document processing AI. Extract structured information from the following ${docType} document.

DOCUMENT CONTENT:
${documentContent}

EXPECTED FIELDS TO EXTRACT:
${expectedFields.map(field => `- ${field}`).join('\n')}

INSTRUCTIONS:
1. Extract all available information for the expected fields
2. Use "N/A" for fields that cannot be found
3. For monetary values, extract as numbers without currency symbols
4. For dates, use ISO format (YYYY-MM-DD) when possible
5. Be precise and accurate

Respond ONLY with a JSON object containing the extracted fields. Example format:
{
  "field_name": "extracted_value",
  "another_field": "another_value"
}`;
  }

  /**
   * Build prompt for document quality analysis
   * @param {string} docType - Document type
   * @param {Object} extractedFields - Extracted fields
   * @returns {string} Formatted prompt
   */
  buildDocumentQualityPrompt(docType, extractedFields) {
    return `You are a document quality analyst. Analyze the completeness and quality of the following ${docType} document based on its extracted fields.

EXTRACTED FIELDS:
${JSON.stringify(extractedFields, null, 2)}

ANALYSIS REQUIREMENTS:
1. Assess completeness (0-100%): How many expected fields are present and valid?
2. Identify missing critical fields
3. Identify data quality issues (invalid formats, suspicious values, inconsistencies)
4. Provide an overall quality score (0-100)
5. List specific recommendations for improvement

Respond ONLY with a JSON object in this exact format:
{
  "completeness_score": 85,
  "quality_score": 90,
  "missing_fields": ["field1", "field2"],
  "quality_issues": [
    {"field": "field_name", "issue": "description", "severity": "High|Medium|Low"}
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "overall_assessment": "Brief assessment text"
}`;
  }

  /**
   * Build prompt for document classification
   * @param {string} documentContent - Document content
   * @returns {string} Formatted prompt
   */
  buildDocumentClassificationPrompt(documentContent) {
    return `You are a document classification AI. Classify the following document into one of these categories:

VALID DOCUMENT TYPES:
- Bank Statement
- Financial Statement
- ID/KYC
- Collateral Proof
- Business Registration
- Tax Return
- Other

DOCUMENT CONTENT:
${documentContent}

INSTRUCTIONS:
1. Analyze the content and determine the most likely document type
2. Provide a confidence score (0-100)
3. Explain your reasoning briefly

Respond ONLY with a JSON object in this exact format:
{
  "document_type": "Bank Statement",
  "confidence": 95,
  "reasoning": "Brief explanation of classification"
}`;
  }

  /**
   * Parse document field extraction response
   * @param {string} responseText - AI response text
   * @param {string} docType - Document type
   * @returns {Object} Parsed extracted fields
   */
  parseDocumentFieldsResponse(responseText, docType) {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          extracted_fields: parsed,
          extraction_success: true
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse document extraction response:', error);
      return {
        extracted_fields: {},
        extraction_success: false,
        error: 'Failed to parse AI response'
      };
    }
  }

  /**
   * Parse document quality analysis response
   * @param {string} responseText - AI response text
   * @returns {Object} Parsed quality analysis
   */
  parseDocumentQualityResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse quality analysis response:', error);
      return {
        completeness_score: 0,
        quality_score: 0,
        missing_fields: [],
        quality_issues: [],
        recommendations: ['Manual review required - AI analysis failed'],
        overall_assessment: 'Unable to assess document quality automatically'
      };
    }
  }

  /**
   * Parse document classification response
   * @param {string} responseText - AI response text
   * @returns {Object} Parsed classification
   */
  parseDocumentClassificationResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse classification response:', error);
      return {
        document_type: 'Other',
        confidence: 0,
        reasoning: 'Classification failed - manual review required'
      };
    }
  }
}

module.exports = new WatsonXService();

// Made with Bob