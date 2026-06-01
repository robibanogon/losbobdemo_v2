/**
 * Upload Generated Documents to IBM Cloud Object Storage
 * This script uploads all generated PDF documents to IBM COS
 * and updates the documents.json with COS keys
 */

const fs = require('fs').promises;
const path = require('path');
const ibmCosService = require('../src/services/ibmCosService');

const DOCUMENTS_FILE = path.join(__dirname, '../data/documents.json');
const GENERATED_DOCS_DIR = path.join(__dirname, '../data/generated_documents');

async function uploadDocumentsToCOS() {
  console.log('Starting document upload to IBM COS...\n');

  try {
    // Check if COS is configured
    if (!ibmCosService.isConfigured()) {
      console.error('❌ IBM COS is not configured. Please set the following environment variables:');
      console.error('   - IBM_COS_API_KEY');
      console.error('   - IBM_COS_INSTANCE_ID');
      console.error('   - IBM_COS_ENDPOINT (optional)');
      console.error('   - IBM_COS_BUCKET_NAME (optional)');
      process.exit(1);
    }

    // Check if bucket exists (don't try to create it - may not have permission)
    try {
      await ibmCosService.cosClient.headBucket({ Bucket: ibmCosService.bucketName }).promise();
      console.log(`✓ IBM COS bucket '${ibmCosService.bucketName}' is accessible\n`);
    } catch (error) {
      if (error.statusCode === 404) {
        console.error(`❌ Bucket '${ibmCosService.bucketName}' does not exist.`);
        console.error('   Please create the bucket in IBM Cloud Object Storage first.');
        process.exit(1);
      } else if (error.statusCode === 403) {
        console.warn(`⚠️  Cannot verify bucket existence (permission denied), but will try to upload anyway...\n`);
      } else {
        throw error;
      }
    }

    // Read documents.json
    const documentsData = await fs.readFile(DOCUMENTS_FILE, 'utf8');
    const documents = JSON.parse(documentsData);
    console.log(`Found ${documents.length} documents in documents.json\n`);

    // Check if generated_documents directory exists
    try {
      await fs.access(GENERATED_DOCS_DIR);
    } catch (error) {
      console.error(`❌ Generated documents directory not found: ${GENERATED_DOCS_DIR}`);
      console.error('   Please run: npm run generate-documents');
      process.exit(1);
    }

    // Get list of generated PDF files
    const files = await fs.readdir(GENERATED_DOCS_DIR);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    console.log(`Found ${pdfFiles.length} PDF files in generated_documents/\n`);

    let uploadCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    // Upload each PDF file and update corresponding document record
    for (const pdfFile of pdfFiles) {
      const filePath = path.join(GENERATED_DOCS_DIR, pdfFile);
      
      // Generate COS key (path in bucket)
      const cosKey = `documents/${pdfFile}`;
      
      try {
        // Upload to COS
        console.log(`Uploading ${pdfFile}...`);
        const result = await ibmCosService.uploadFile(filePath, cosKey, {
          uploadedBy: 'system',
          uploadDate: new Date().toISOString(),
          source: 'generated_documents'
        });
        
        if (result.success) {
          uploadCount++;
          console.log(`  ✓ Uploaded to COS: ${cosKey}`);
          console.log(`  URL: ${result.url}\n`);
          
          // Find matching document in documents.json
          // Match by filename pattern (e.g., "juan_delacruz_BankStatement.pdf")
          const matchingDocs = documents.filter(doc => {
            const docFilename = path.basename(doc.storage_path || '');
            return pdfFile.includes(docFilename.replace('.pdf', '')) || 
                   docFilename.includes(pdfFile.replace('.pdf', ''));
          });
          
          // If no exact match, try to match by document type
          if (matchingDocs.length === 0) {
            const docType = pdfFile.split('_').pop().replace('.pdf', '');
            const typeMatches = documents.filter(doc => 
              doc.doc_type && doc.doc_type.replace(/\s+/g, '').toLowerCase().includes(docType.toLowerCase())
            );
            
            if (typeMatches.length > 0 && !typeMatches[0].cos_key) {
              typeMatches[0].cos_key = cosKey;
              typeMatches[0].cos_url = result.url;
              updateCount++;
              console.log(`  ✓ Updated document record: ${typeMatches[0].id}`);
            }
          } else {
            // Update all matching documents
            matchingDocs.forEach(doc => {
              if (!doc.cos_key) {
                doc.cos_key = cosKey;
                doc.cos_url = result.url;
                updateCount++;
                console.log(`  ✓ Updated document record: ${doc.id}`);
              }
            });
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to upload ${pdfFile}:`, error.message);
      }
    }

    // Also add cos_key for documents that match generated files
    for (const doc of documents) {
      if (!doc.cos_key && doc.storage_path) {
        const filename = path.basename(doc.storage_path);
        const matchingPdf = pdfFiles.find(pdf => 
          pdf.includes(filename.replace('.pdf', '')) ||
          filename.includes(pdf.replace('.pdf', ''))
        );
        
        if (matchingPdf) {
          doc.cos_key = `documents/${matchingPdf}`;
          doc.cos_url = ibmCosService.getPublicUrl(doc.cos_key);
          updateCount++;
          console.log(`  ✓ Added COS reference to document: ${doc.id}`);
        } else {
          skipCount++;
        }
      }
    }

    // Save updated documents.json
    await fs.writeFile(DOCUMENTS_FILE, JSON.stringify(documents, null, 2));
    console.log(`\n✓ Updated documents.json with COS keys\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('Upload Summary:');
    console.log(`  Total PDF files: ${pdfFiles.length}`);
    console.log(`  Uploaded to COS: ${uploadCount}`);
    console.log(`  Document records updated: ${updateCount}`);
    console.log(`  Skipped (no match): ${skipCount}`);
    console.log('═══════════════════════════════════════\n');

    console.log('✓ Document upload complete!');
    console.log('\nDocuments are now available in IBM Cloud Object Storage.');
    console.log('Users can view and download documents through the application.\n');

  } catch (error) {
    console.error('\n❌ Error uploading documents:', error);
    process.exit(1);
  }
}

// Run the upload
uploadDocumentsToCOS();

// Made with Bob
