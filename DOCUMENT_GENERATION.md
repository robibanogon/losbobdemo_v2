# Document Generation System

## Overview

The Document Generation System automatically creates realistic Philippine-format documents for loan application actors. It generates 6 types of documents per actor in PDF format, following authentic Philippine banking and government document standards.

## Features

### Generated Document Types

1. **Bank Statement (BDO Format)**
   - Authentic BDO Unibank layout
   - Transaction history with debits/credits
   - Account summary with balances
   - Philippine Peso (₱) formatting

2. **Financial Statement (Audited)**
   - Statement of Financial Position
   - Statement of Comprehensive Income
   - Assets, Liabilities, and Equity breakdown
   - Revenue and expense details

3. **ID/KYC Document (Philippine National ID)**
   - Philippine Statistics Authority format
   - Personal information with PSN
   - Government ID numbers (TIN, SSS, PhilHealth, Pag-IBIG)
   - KYC verification details

4. **Collateral Proof (Transfer Certificate of Title)**
   - Land Registration Authority format
   - Property details and technical description
   - Registered owner information
   - Property valuation and tax declaration

5. **Business Registration (DTI/SEC)**
   - Department of Trade and Industry certificate
   - Business name and owner details
   - Registration and validity dates
   - Capital investment information

6. **Tax Return (BIR Form 1701)**
   - Bureau of Internal Revenue format
   - Income and deduction details
   - Tax computation and summary
   - Annual tax filing information

## Architecture

### Services

#### DocumentGeneratorService
**Location:** [`backend/src/services/documentGeneratorService.js`](backend/src/services/documentGeneratorService.js)

Generates PDF documents using PDFKit library with Philippine format templates.

**Key Methods:**
- `generateBankStatement(actor, accountNumber)` - BDO bank statement
- `generateFinancialStatement(actor, businessName)` - Audited financial statements
- `generateIDDocument(actor)` - Philippine National ID and KYC
- `generateCollateralProof(actor, propertyType)` - Transfer Certificate of Title
- `generateBusinessRegistration(actor, businessName, type)` - DTI/SEC certificate
- `generateTaxReturn(actor, year)` - BIR Form 1701
- `generateAllDocuments(actor)` - Generate all 6 documents for an actor

**Helper Methods:**
- `formatPeso(amount)` - Format currency in Philippine Peso
- `generatePSN()` - Generate Philippine Statistics Number
- `generateTIN()` - Generate Tax Identification Number
- `generateSSS()` - Generate Social Security System number
- `generatePhilHealth()` - Generate PhilHealth number
- `generatePagIBIG()` - Generate Pag-IBIG number

#### IBMCosService
**Location:** [`backend/src/services/ibmCosService.js`](backend/src/services/ibmCosService.js)

Manages document uploads to IBM Cloud Object Storage using S3-compatible API.

**Key Methods:**
- `uploadFile(filePath, objectKey, metadata)` - Upload single file
- `uploadMultipleFiles(files)` - Upload multiple files
- `uploadActorDocuments(username, documentPaths)` - Upload all actor documents
- `downloadFile(objectKey, downloadPath)` - Download file from COS
- `deleteFile(objectKey)` - Delete file from COS
- `listFiles(prefix)` - List files in bucket
- `getPresignedUrl(objectKey, expiresIn)` - Generate temporary access URL

### Scripts

#### generateDocuments.js
**Location:** [`backend/scripts/generateDocuments.js`](backend/scripts/generateDocuments.js)

Main script to generate documents for all actors and upload to IBM COS.

**Usage:**
```bash
cd backend
node scripts/generateDocuments.js
```

**Process:**
1. Loads actor data (4 actors)
2. Generates 6 documents per actor (24 total)
3. Saves PDFs locally to `backend/data/generated_documents/`
4. Uploads to IBM COS (if configured)
5. Generates summary report
6. Saves results to `backend/data/generation_results.json`

## Configuration

### Environment Variables

Add to [`backend/.env`](backend/.env):

```env
# IBM Cloud Object Storage Configuration
IBM_COS_API_KEY=your_ibm_cos_api_key_here
IBM_COS_INSTANCE_ID=your_ibm_cos_instance_id_here
IBM_COS_ENDPOINT=s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET_NAME=loan-documents
```

### Getting IBM COS Credentials

1. **Create IBM Cloud Account**
   - Visit https://cloud.ibm.com
   - Sign up or log in

2. **Create Object Storage Instance**
   - Navigate to Catalog > Storage > Object Storage
   - Create a new instance
   - Note the Instance ID (CRN)

3. **Create Service Credentials**
   - Go to Service Credentials tab
   - Click "New credential"
   - Enable "Include HMAC Credential"
   - Copy API Key and Instance ID

4. **Create Bucket**
   - Go to Buckets tab
   - Create new bucket (e.g., "loan-documents")
   - Choose region (e.g., us-south)
   - Select storage class (Standard recommended)

5. **Configure Endpoint**
   - Use regional endpoint for your bucket location
   - Example: `s3.us-south.cloud-object-storage.appdomain.cloud`

## Usage

### Generate Documents for All Actors

```bash
cd backend
node scripts/generateDocuments.js
```

**Output:**
```
🚀 Starting Document Generation Process
📅 Date: 2026-05-31T09:47:14.736Z
👥 Actors: 4
📄 Documents per actor: 6
📊 Total documents to generate: 24

============================================================
Generating documents for: Maria Santos (maria_santos)
============================================================

📄 Generating documents...
✅ Documents generated successfully!
⏱️  Generation time: 0.28s

☁️  Uploading documents to IBM Cloud Object Storage...
✅ Upload completed successfully!
⏱️  Upload time: 2.15s
📊 Uploaded 6/6 documents

============================================================
📊 GENERATION SUMMARY REPORT
============================================================

Total Actors: 4
Successful Generations: 4/4
Successful Uploads: 4/4

📄 Total Documents Generated: 24

💾 Local Storage:
  Location: backend/data/generated_documents/
  Format: PDF

☁️  Cloud Storage:
  Service: IBM Cloud Object Storage
  Bucket: loan-documents
  Uploaded: 24 documents

⏱️  Total execution time: 8.95s
✅ Document generation process completed!
```

### Programmatic Usage

```javascript
const documentGenerator = require('./src/services/documentGeneratorService');
const ibmCosService = require('./src/services/ibmCosService');

// Generate documents for a single actor
const actor = {
  username: 'maria_santos',
  name: 'Maria Santos',
  email: 'maria.santos@bank.ph',
  role: 'Relationship Manager'
};

// Generate all documents
const documents = await documentGenerator.generateAllDocuments(actor);

// Upload to IBM COS
const uploadResults = await ibmCosService.uploadActorDocuments(
  actor.username,
  documents
);

console.log('Upload results:', uploadResults);
```

### Generate Individual Documents

```javascript
// Bank Statement
const bankStatement = await documentGenerator.generateBankStatement(
  actor,
  '1234567890'
);

// Financial Statement
const financialStatement = await documentGenerator.generateFinancialStatement(
  actor,
  'Santos Enterprises'
);

// ID/KYC Document
const idDocument = await documentGenerator.generateIDDocument(actor);

// Collateral Proof
const collateralProof = await documentGenerator.generateCollateralProof(
  actor,
  'Residential'
);

// Business Registration
const businessReg = await documentGenerator.generateBusinessRegistration(
  actor,
  'Santos Enterprises',
  'DTI'
);

// Tax Return
const taxReturn = await documentGenerator.generateTaxReturn(actor, 2025);
```

## Generated Documents

### File Structure

```
backend/data/generated_documents/
├── maria_santos_BankStatement.pdf
├── maria_santos_FinancialStatement.pdf
├── maria_santos_ID_KYC.pdf
├── maria_santos_CollateralProof.pdf
├── maria_santos_BusinessRegistration.pdf
├── maria_santos_TaxReturn.pdf
├── juan_delacruz_BankStatement.pdf
├── juan_delacruz_FinancialStatement.pdf
├── juan_delacruz_ID_KYC.pdf
├── juan_delacruz_CollateralProof.pdf
├── juan_delacruz_BusinessRegistration.pdf
├── juan_delacruz_TaxReturn.pdf
├── ana_reyes_BankStatement.pdf
├── ana_reyes_FinancialStatement.pdf
├── ana_reyes_ID_KYC.pdf
├── ana_reyes_CollateralProof.pdf
├── ana_reyes_BusinessRegistration.pdf
├── ana_reyes_TaxReturn.pdf
├── admin_BankStatement.pdf
├── admin_FinancialStatement.pdf
├── admin_ID_KYC.pdf
├── admin_CollateralProof.pdf
├── admin_BusinessRegistration.pdf
└── admin_TaxReturn.pdf
```

### IBM COS Structure

```
loan-documents/
├── actors/
│   ├── maria_santos/
│   │   ├── bankStatement.pdf
│   │   ├── financialStatement.pdf
│   │   ├── idDocument.pdf
│   │   ├── collateralProof.pdf
│   │   ├── businessRegistration.pdf
│   │   └── taxReturn.pdf
│   ├── juan_delacruz/
│   │   └── ... (6 documents)
│   ├── ana_reyes/
│   │   └── ... (6 documents)
│   └── admin/
│       └── ... (6 documents)
```

## Document Specifications

### Bank Statement (BDO Format)

**Features:**
- BDO Unibank header with logo and contact info
- Account information box
- Transaction history table with dates, descriptions, debits, credits, balances
- Summary section with beginning/ending balances, total credits/debits
- Average daily balance calculation
- Computer-generated statement footer

**Sample Data:**
- Beginning Balance: ₱125,000.00
- Monthly Salary Deposits: ₱75,000.00
- Various expenses (utilities, rent, etc.)
- Ending Balance: ₱290,300.00
- 3-month transaction history

### Financial Statement

**Features:**
- Statement of Financial Position (Balance Sheet)
- Statement of Comprehensive Income (P&L)
- Current and Non-Current Assets breakdown
- Liabilities and Equity sections
- Revenue, Cost of Sales, Operating Expenses
- Net Income calculation
- CPA certification footer

**Sample Data:**
- Total Assets: ₱12,000,000
- Total Liabilities: ₱5,000,000
- Total Equity: ₱7,000,000
- Annual Revenue: ₱15,000,000
- Net Income: ₱1,260,000

### ID/KYC Document

**Features:**
- Philippine National ID card simulation
- Personal information (name, PSN, date of birth, sex, blood type)
- Address details
- Government ID numbers (TIN, SSS, PhilHealth, Pag-IBIG)
- Citizenship and occupation
- Contact information
- Verification statement with signature line

**Sample Data:**
- PSN: 1234-5678-9012-3456
- TIN: 123-456-789-0000
- SSS: 12-3456789-0
- PhilHealth: 12-345678901-2
- Pag-IBIG: 1234-5678-9012

### Collateral Proof (TCT)

**Features:**
- Transfer Certificate of Title format
- Registry of Deeds header
- Property details (lot number, block, survey number, area)
- Registered owner information
- Property valuation (market value, assessed value)
- Encumbrances section
- Technical description
- Register of Deeds certification

**Sample Data:**
- TCT No.: 123456
- Land Area: 100-400 sq.m.
- Market Value: ₱5,000,000 - ₱15,000,000
- Location: Makati City, Metro Manila

### Business Registration

**Features:**
- DTI or SEC certificate format
- Certificate number and business name
- Owner/corporate officer information
- Business address and contact details
- Nature of business and capital investment
- Registration and validity dates
- Government agency certification

**Sample Data:**
- DTI Certificate No.: DTI-NCR-1234567
- Capital Investment: ₱500,000
- Valid for 5 years
- Nature: Trading and Services

### Tax Return (BIR Form 1701)

**Features:**
- Bureau of Internal Revenue header
- Taxpayer information section
- Income details (gross sales, cost of sales, gross income)
- Deductions breakdown (salaries, rent, utilities, etc.)
- Tax computation (taxable income, tax due, credits)
- Summary section
- Declaration and signature lines
- CPA certification

**Sample Data:**
- Gross Sales: ₱15,000,000
- Total Deductions: ₱4,000,000
- Taxable Income: ₱6,200,000
- Income Tax Due: ₱1,860,000

## Performance

### Generation Speed

- **Single Actor:** ~0.05-0.28 seconds
- **All 4 Actors (24 documents):** ~0.48 seconds
- **Average per Document:** ~0.02 seconds

### File Sizes

- Bank Statement: ~2.7 KB
- Financial Statement: ~3.4 KB
- ID/KYC Document: ~3.0 KB
- Collateral Proof: ~3.3 KB
- Business Registration: ~2.4 KB
- Tax Return: ~3.6 KB
- **Total per Actor:** ~18.4 KB
- **Total for 4 Actors:** ~73.6 KB

### Upload Speed (IBM COS)

- **Single Document:** ~0.3-0.5 seconds
- **6 Documents per Actor:** ~2-3 seconds
- **All 24 Documents:** ~8-12 seconds

## Integration with Document Intelligence

The generated documents can be analyzed using the Document Intelligence feature:

```javascript
const documentService = require('./src/services/documentService');

// Analyze document quality
const qualityAnalysis = await documentService.analyzeDocumentQuality('doc-001');

// Extract fields using AI
const extractedFields = await documentService.aiExtractFields('doc-001');

// Classify document type
const classification = await documentService.classifyDocument('doc-001');

// Comprehensive analysis
const intelligence = await documentService.performDocumentIntelligence('doc-001');
```

## Troubleshooting

### Common Issues

1. **IBM COS Upload Fails**
   - Verify credentials in `.env`
   - Check bucket name and region
   - Ensure HMAC credentials are enabled
   - Verify network connectivity

2. **PDF Generation Errors**
   - Ensure PDFKit is installed: `npm install pdfkit`
   - Check write permissions for `backend/data/generated_documents/`
   - Verify actor data format

3. **Missing Documents**
   - Check generation results in `backend/data/generation_results.json`
   - Review console output for errors
   - Verify all 6 document types are generated

### Debug Mode

Enable detailed logging:

```javascript
// In generateDocuments.js
console.log('Document paths:', documents);
console.log('Upload results:', uploadResults);
```

## Best Practices

1. **Regular Generation**
   - Regenerate documents periodically for testing
   - Keep documents up-to-date with current formats

2. **Backup Strategy**
   - Local copies in `backend/data/generated_documents/`
   - Cloud backup in IBM COS
   - Version control for generation scripts

3. **Security**
   - Never commit `.env` file with real credentials
   - Use environment-specific credentials
   - Implement access controls on IBM COS bucket

4. **Testing**
   - Verify PDF content and formatting
   - Test document intelligence integration
   - Validate Philippine format compliance

## Future Enhancements

- [ ] Add more document types (Payslips, Utility Bills)
- [ ] Support multiple bank formats (BPI, Metrobank)
- [ ] Generate documents in multiple languages
- [ ] Add digital signatures
- [ ] Implement document versioning
- [ ] Add watermarks for test documents
- [ ] Support batch generation via API
- [ ] Add document templates customization

## Related Documentation

- [Document Intelligence](DOCUMENT_INTELLIGENCE.md) - AI-powered document analysis
- [Watsonx Integration](WATSONX_INTEGRATION.md) - IBM watsonx.ai setup
- [API Documentation](API_DOCUMENTATION.md) - REST API endpoints

## Support

For issues or questions:
- Check troubleshooting section above
- Review console output and error logs
- Verify environment configuration
- Test with sample data first

---

**Last Updated:** May 31, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅