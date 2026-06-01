/**
 * Prepare Approved Applications Script
 * 
 * This script ensures all approved/completed applications have:
 * 1. Complete set of documents (Bank Statement, Financial Statement, ID/KYC, Collateral Proof)
 * 2. Generated PDF files for each document
 * 3. Documents uploaded to IBM COS
 * 4. Document metadata updated with COS keys
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const ibmCosService = require('../src/services/ibmCosService');

const DATA_DIR = path.join(__dirname, '../data');
const GENERATED_DOCS_DIR = path.join(DATA_DIR, 'generated_documents');

// Document types required for all approved applications
const REQUIRED_DOC_TYPES = [
  'Bank Statement',
  'Financial Statement',
  'ID/KYC',
  'Collateral Proof'
];

/**
 * Load JSON file
 */
async function loadJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Save JSON file
 */
async function saveJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Generate extracted fields for a document type
 */
function generateExtractedFields(docType) {
  const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  switch (docType) {
    case 'Bank Statement':
      return {
        total_credits: randomNumber(100000, 500000),
        total_debits: randomNumber(80000, 400000),
        ending_balance: randomNumber(50000, 200000),
        statement_period: '3 months',
        average_monthly_balance: randomNumber(40000, 180000)
      };
    
    case 'Financial Statement':
      const revenue = randomNumber(200000, 1000000);
      const expenses = Math.floor(revenue * 0.75);
      return {
        total_revenue: revenue,
        total_expenses: expenses,
        net_income: revenue - expenses,
        total_assets: randomNumber(500000, 2000000),
        total_liabilities: randomNumber(200000, 1000000),
        period: 'Annual'
      };
    
    case 'ID/KYC':
      return {
        id_type: 'Government ID',
        id_number: `XXXX-XXXX-${randomNumber(1000, 9999)}`,
        name_on_id: 'Verified',
        expiry_date: '2028-12-31'
      };
    
    case 'Collateral Proof':
      const types = ['Real Estate', 'Equipment', 'Vehicle'];
      const locations = ['Metro Manila', 'Cebu', 'Davao', 'Quezon City'];
      return {
        property_type: types[randomNumber(0, types.length - 1)],
        assessed_value: randomNumber(1000000, 5000000),
        location: locations[randomNumber(0, locations.length - 1)],
        title_number: `TCT-${randomNumber(10000, 99999)}`
      };
    
    default:
      return {
        extracted: true,
        notes: 'Document received and verified'
      };
  }
}

/**
 * Generate a PDF document
 */
async function generatePDF(docType, application, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = require('fs').createWriteStream(outputPath);
    
    doc.pipe(stream);
    
    // Header
    doc.fontSize(20).text(docType, { align: 'center' });
    doc.moveDown();
    
    // Application details
    doc.fontSize(12);
    doc.text(`Application Number: ${application.application_number}`);
    doc.text(`Business Name: ${application.applicant.legal_name}`);
    doc.text(`Business Type: ${application.applicant.business_type}`);
    doc.text(`Industry: ${application.applicant.industry}`);
    doc.moveDown();
    
    // Document-specific content
    doc.fontSize(14).text('Document Details:', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    
    switch (docType) {
      case 'Bank Statement':
        doc.text('Statement Period: Last 3 months');
        doc.text(`Total Credits: ₱${application.financial_snapshot.monthly_revenue.toLocaleString()}`);
        doc.text(`Total Debits: ₱${application.financial_snapshot.monthly_expenses.toLocaleString()}`);
        doc.text(`Ending Balance: ₱${(application.financial_snapshot.monthly_revenue - application.financial_snapshot.monthly_expenses).toLocaleString()}`);
        doc.text(`Average Monthly Balance: ₱${application.financial_snapshot.monthly_revenue.toLocaleString()}`);
        break;
      
      case 'Financial Statement':
        doc.text('Period: Annual Financial Statement');
        doc.text(`Total Revenue: ₱${(application.financial_snapshot.monthly_revenue * 12).toLocaleString()}`);
        doc.text(`Total Expenses: ₱${(application.financial_snapshot.monthly_expenses * 12).toLocaleString()}`);
        doc.text(`Net Income: ₱${((application.financial_snapshot.monthly_revenue - application.financial_snapshot.monthly_expenses) * 12).toLocaleString()}`);
        doc.text(`Total Assets: ₱${(application.collateral.estimated_value * 2).toLocaleString()}`);
        doc.text(`Total Liabilities: ₱${application.loan_request.amount.toLocaleString()}`);
        break;
      
      case 'ID/KYC':
        doc.text('Know Your Customer (KYC) Document');
        doc.text(`Owner Name: ${application.owner_info.name}`);
        doc.text(`ID Number: ${application.owner_info.id_number}`);
        doc.text(`ID Type: Government-issued ID`);
        doc.text(`Expiry Date: 2028-12-31`);
        doc.text(`Verification Status: Verified`);
        break;
      
      case 'Collateral Proof':
        doc.text('Collateral Documentation');
        doc.text(`Collateral Type: ${application.collateral.type}`);
        doc.text(`Estimated Value: ₱${application.collateral.estimated_value.toLocaleString()}`);
        doc.text(`Title/Reference Number: TCT-${Math.floor(Math.random() * 90000) + 10000}`);
        doc.text(`Location: Metro Manila`);
        doc.text(`Assessment Date: ${new Date().toLocaleDateString()}`);
        break;
    }
    
    doc.moveDown(2);
    doc.fontSize(10).text('This is a system-generated document for demonstration purposes.', { align: 'center', color: 'gray' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center', color: 'gray' });
    
    doc.end();
    
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('=== Preparing Approved Applications ===\n');
    
    // Ensure generated_documents directory exists
    try {
      await fs.mkdir(GENERATED_DOCS_DIR, { recursive: true });
      console.log('✓ Generated documents directory ready\n');
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Load data
    console.log('Loading data files...');
    const applications = await loadJSON('applications.json');
    let documents = await loadJSON('documents.json');
    console.log(`✓ Loaded ${applications.length} applications and ${documents.length} documents\n`);
    
    // Filter approved/completed applications
    const approvedApps = applications.filter(app => 
      ['Approved', 'Completed'].includes(app.status)
    );
    console.log(`Found ${approvedApps.length} approved/completed applications\n`);
    
    let addedDocs = 0;
    let generatedPDFs = 0;
    let uploadedToCOS = 0;
    
    // Process each approved application
    for (const app of approvedApps) {
      console.log(`Processing ${app.application_number} (${app.applicant.legal_name})...`);
      
      // Get existing documents for this application
      const appDocs = documents.filter(d => d.application_id === app.id);
      const existingTypes = appDocs.map(d => d.doc_type);
      
      // Find missing document types
      const missingTypes = REQUIRED_DOC_TYPES.filter(type => !existingTypes.includes(type));
      
      // Add missing documents
      for (const docType of missingTypes) {
        const docId = uuidv4();
        const filename = `${app.applicant.legal_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${docType.replace(/\//g, '_').replace(/\s+/g, '')}.pdf`;
        
        const newDoc = {
          id: docId,
          application_id: app.id,
          doc_type: docType,
          filename: filename,
          original_filename: `${docType}.pdf`,
          storage_path: `/data/generated_documents/${filename}`,
          file_size: Math.floor(Math.random() * 1000000) + 500000,
          mime_type: 'application/pdf',
          uploaded_by: app.owner_user_id,
          uploaded_at: new Date().toISOString(),
          extracted_fields: generateExtractedFields(docType)
        };
        
        documents.push(newDoc);
        addedDocs++;
        console.log(`  + Added ${docType} document`);
      }
      
      // Generate PDFs for all documents of this application
      const allAppDocs = documents.filter(d => d.application_id === app.id);
      
      for (const doc of allAppDocs) {
        const pdfPath = path.join(GENERATED_DOCS_DIR, doc.filename);
        
        // Check if PDF already exists
        try {
          await fs.access(pdfPath);
          console.log(`  ✓ PDF exists: ${doc.filename}`);
        } catch {
          // Generate PDF
          await generatePDF(doc.doc_type, app, pdfPath);
          generatedPDFs++;
          console.log(`  ✓ Generated PDF: ${doc.filename}`);
        }
        
        // Upload to COS if configured
        if (ibmCosService.isConfigured()) {
          try {
            const cosKey = `documents/${doc.filename}`;
            const fileBuffer = await fs.readFile(pdfPath);
            
            await ibmCosService.uploadFile(cosKey, fileBuffer, 'application/pdf');
            
            // Update document with COS info
            doc.cos_key = cosKey;
            doc.cos_url = await ibmCosService.getPresignedUrl(cosKey, 3600);
            
            uploadedToCOS++;
            console.log(`  ✓ Uploaded to COS: ${cosKey}`);
          } catch (err) {
            console.log(`  ✗ COS upload failed: ${err.message}`);
          }
        }
      }
      
      console.log();
    }
    
    // Save updated documents
    await saveJSON('documents.json', documents);
    
    console.log('=== Summary ===');
    console.log(`✓ Processed ${approvedApps.length} approved/completed applications`);
    console.log(`✓ Added ${addedDocs} missing documents`);
    console.log(`✓ Generated ${generatedPDFs} PDF files`);
    console.log(`✓ Uploaded ${uploadedToCOS} files to IBM COS`);
    console.log(`✓ Total documents: ${documents.length}`);
    console.log('\n✓ All approved applications now have complete documents!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

// Made with Bob
