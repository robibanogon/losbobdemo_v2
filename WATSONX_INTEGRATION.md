# IBM watsonx.ai Integration Guide

## Overview

This loan origination system now integrates with **IBM watsonx.ai** to provide AI-powered credit analysis and agent reviews. The system supports multiple AI models and can fall back to rule-based analysis if watsonx.ai is not configured.

## Features

### ✅ AI-Powered Agent Review
- Intelligent credit risk assessment
- Natural language recommendation generation
- Contextual analysis of financial data
- Explainable AI decisions with metadata

### ✅ Multiple Model Support
- **Meta Llama 3.3 70B Instruct** - Strong reasoning, multilingual capabilities
- **IBM GPT OSS 120B** - Large-scale comprehensive analysis
- **IBM Granite 13B Instruct** - Business-optimized, compliance-aware

### ✅ Model Comparison
- Side-by-side comparison of different models
- Performance metrics (tokens, duration)
- Decision consistency analysis

### ✅ Graceful Fallback
- Automatic fallback to rule-based analysis if AI fails
- No disruption to existing workflows
- Hybrid approach support

---

## Setup Instructions

### 1. Get IBM watsonx.ai Credentials

#### Step 1: Create IBM Cloud Account
1. Go to [IBM Cloud](https://cloud.ibm.com)
2. Sign up or log in to your account

#### Step 2: Get API Key
1. Navigate to [IBM Cloud API Keys](https://cloud.ibm.com/iam/apikeys)
2. Click **Create an IBM Cloud API key**
3. Give it a name (e.g., "LOS watsonx Integration")
4. Copy and save the API key securely

#### Step 3: Create watsonx.ai Project
1. Go to [IBM watsonx.ai](https://dataplatform.cloud.ibm.com)
2. Create a new project or use an existing one
3. Copy the **Project ID** from the project settings

### 2. Configure Environment Variables

Edit `backend/.env` file (create from `.env.example` if needed):

```bash
# IBM watsonx.ai Configuration
WATSONX_API_KEY=your_actual_api_key_here
WATSONX_PROJECT_ID=your_actual_project_id_here
WATSONX_API_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29
WATSONX_DEFAULT_MODEL=llama-3-3-70b-instruct
```

### 3. Install Dependencies

```bash
cd backend
npm install axios
```

### 4. Restart Backend Server

```bash
cd backend
npm start
```

---

## API Usage

### Run AI-Powered Agent Review

**Endpoint:** `POST /api/applications/:id/agent-review`

**Request Body (Optional):**
```json
{
  "useAI": true,
  "model": "llama-3-3-70b-instruct"
}
```

**Available Models:**
- `llama-3-3-70b-instruct` (default)
- `gpt-oss-120b`
- `granite-13b-instruct`

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/applications/test-app-001/agent-review \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-3-70b-instruct"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "application_id": "test-app-001",
  "recommended_decision": "Approve",
  "recommendation_reason": "Strong financial position with DSCR of 2.5...",
  "data_quality_warnings": [],
  "risk_flags": [],
  "recommended_conditions": [
    {
      "condition": "Maintain minimum DSCR of 1.2",
      "type": "Post-disbursement"
    }
  ],
  "key_strengths": [
    "Excellent credit score of 720",
    "Strong cashflow coverage"
  ],
  "key_concerns": [
    "Collateral coverage slightly below optimal"
  ],
  "overall_assessment": "Low risk application with strong fundamentals",
  "ai_powered": true,
  "ai_model": "llama-3-3-70b-instruct",
  "ai_metadata": {
    "model": "llama-3-3-70b-instruct",
    "modelId": "meta-llama/llama-3-3-70b-instruct",
    "tokensGenerated": 450,
    "duration": 2500,
    "timestamp": "2026-05-31T09:00:00.000Z"
  }
}
```

### Compare AI Models

**Endpoint:** `POST /api/applications/:id/agent-review/compare`

**Request Body (Optional):**
```json
{
  "models": ["llama-3-3-70b-instruct", "gpt-oss-120b"]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/applications/test-app-001/agent-review/compare \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "models": ["llama-3-3-70b-instruct", "gpt-oss-120b"]
  }'
```

**Response:**
```json
{
  "application_id": "test-app-001",
  "application_number": "APP-2026-TEST-001",
  "models_compared": ["llama-3-3-70b-instruct", "gpt-oss-120b"],
  "comparison": {
    "llama-3-3-70b-instruct": {
      "success": true,
      "result": { /* full review object */ },
      "model": {
        "id": "meta-llama/llama-3-3-70b-instruct",
        "description": "Meta Llama 3.3 70B - Strong reasoning, multilingual"
      }
    },
    "gpt-oss-120b": {
      "success": true,
      "result": { /* full review object */ },
      "model": {
        "id": "ibm/gpt-oss-120b",
        "description": "IBM GPT OSS 120B - Large scale, comprehensive analysis"
      }
    }
  },
  "compared_at": "2026-05-31T09:00:00.000Z"
}
```

---

## Model Comparison: Llama 3.3 70B vs GPT OSS 120B

### Meta Llama 3.3 70B Instruct

**Strengths:**
- ✅ **Strong Reasoning**: Excellent at complex financial analysis
- ✅ **Multilingual**: Supports multiple languages for international applications
- ✅ **Balanced Performance**: Good speed-to-quality ratio
- ✅ **Cost-Effective**: Lower token costs compared to larger models
- ✅ **Instruction Following**: Highly responsive to structured prompts

**Best For:**
- Standard loan applications
- Multi-language support needed
- Fast turnaround requirements
- Cost-sensitive deployments

**Recommended Settings:**
```javascript
{
  temperature: 0.3,  // Lower for consistent financial analysis
  maxTokens: 2048,
  topP: 0.9
}
```

---

### IBM GPT OSS 120B

**Strengths:**
- ✅ **Comprehensive Analysis**: More detailed assessments
- ✅ **Large Context**: Better handling of complex applications
- ✅ **Nuanced Understanding**: Deeper insights into edge cases
- ✅ **IBM Optimized**: Tuned for enterprise use cases

**Best For:**
- Complex loan applications
- High-value loans requiring detailed analysis
- Edge cases and unusual scenarios
- When maximum accuracy is critical

**Recommended Settings:**
```javascript
{
  temperature: 0.3,
  maxTokens: 2048,
  topP: 0.95
}
```

---

## Performance Comparison

| Metric | Llama 3.3 70B | GPT OSS 120B |
|--------|---------------|--------------|
| **Speed** | ⚡⚡⚡ Fast (2-3s) | ⚡⚡ Moderate (3-5s) |
| **Accuracy** | ⭐⭐⭐⭐ High | ⭐⭐⭐⭐⭐ Very High |
| **Cost** | 💰💰 Moderate | 💰💰💰 Higher |
| **Context Length** | 8K tokens | 8K tokens |
| **Reasoning** | ⭐⭐⭐⭐ Strong | ⭐⭐⭐⭐⭐ Excellent |
| **Multilingual** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |

---

## Recommendation

### 🏆 **Default Choice: Llama 3.3 70B Instruct**

**Why?**
1. **Best Balance**: Excellent quality-to-speed-to-cost ratio
2. **Proven Performance**: Strong track record in financial analysis
3. **Fast Response**: 2-3 second average response time
4. **Cost Effective**: Lower operational costs
5. **Multilingual**: Better for international operations

### 🎯 **When to Use GPT OSS 120B:**
- High-value loans (>₱500,000)
- Complex business structures
- Edge cases requiring deeper analysis
- When maximum accuracy is critical
- Regulatory compliance reviews

### 💡 **Hybrid Approach:**
Use Llama 3.3 70B for initial screening, then GPT OSS 120B for:
- Applications flagged for manual review
- High-risk applications
- Large loan amounts
- Complex financial structures

---

## Code Examples

### Using Specific Model

```javascript
// In your application code
const review = await agentReviewService.runReview(
  applicationId,
  userId,
  userName,
  {
    useAI: true,
    model: 'llama-3-3-70b-instruct'  // or 'gpt-oss-120b'
  }
);
```

### Comparing Models

```javascript
const watsonxService = require('./services/watsonxService');

const comparison = await watsonxService.compareModels(
  application,
  analysis,
  documents,
  missingDocs,
  policy,
  ['llama-3-3-70b-instruct', 'gpt-oss-120b']
);

console.log('Llama Decision:', comparison['llama-3-3-70b-instruct'].result.recommended_decision);
console.log('GPT Decision:', comparison['gpt-oss-120b'].result.recommended_decision);
```

### Checking Configuration

```javascript
const watsonxService = require('./services/watsonxService');

if (watsonxService.isConfigured()) {
  console.log('✅ watsonx.ai is configured');
  console.log('Available models:', watsonxService.getAvailableModels());
} else {
  console.log('❌ watsonx.ai is not configured - using rule-based analysis');
}
```

---

## Troubleshooting

### Issue: "WatsonX AI is not configured"

**Solution:**
1. Check `.env` file has correct credentials
2. Verify `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` are set
3. Restart the backend server

### Issue: "Model not found"

**Solution:**
Use one of the supported models:
- `llama-3-3-70b-instruct`
- `gpt-oss-120b`
- `granite-13b-instruct`

### Issue: API timeout

**Solution:**
1. Check internet connectivity
2. Verify IBM Cloud service status
3. Increase timeout in `watsonxService.js` (default: 60s)

### Issue: Parsing errors

**Solution:**
The system automatically falls back to rule-based analysis if AI parsing fails. Check logs for details.

---

## Cost Optimization

### Tips to Reduce Costs:

1. **Use Llama 3.3 70B as default** - Lower cost per token
2. **Set appropriate temperature** - Lower temperature (0.3) reduces token usage
3. **Limit max tokens** - Set to 2048 for most cases
4. **Cache results** - Store reviews to avoid re-analysis
5. **Batch processing** - Process multiple applications in off-peak hours

### Estimated Costs (per review):

| Model | Tokens | Cost (USD) |
|-------|--------|------------|
| Llama 3.3 70B | ~500 | $0.01-0.02 |
| GPT OSS 120B | ~600 | $0.03-0.05 |

*Costs are approximate and vary based on IBM Cloud pricing*

---

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Update API keys every 90 days
3. **Use IAM policies** - Restrict API key permissions
4. **Monitor usage** - Track API calls and costs
5. **Audit logs** - Review AI decisions regularly

---

## Future Enhancements

- [ ] Document intelligence with watsonx.ai OCR
- [ ] Fraud detection models
- [ ] Sentiment analysis of business narratives
- [ ] Predictive default probability
- [ ] Portfolio risk modeling
- [ ] watsonx.governance integration for explainability

---

## Support

For issues or questions:
1. Check IBM watsonx.ai documentation: https://www.ibm.com/docs/en/watsonx-as-a-service
2. Review API reference: https://cloud.ibm.com/apidocs/watsonx-ai
3. Contact IBM Cloud support

---

**Made with Bob** 🤖