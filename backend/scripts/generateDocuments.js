/**
 * @fileoverview Document Generation Script
 * @description Generates Philippine-format documents for all actors and uploads to IBM COS
 */

const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const documentGenerator = require('../src/services/documentGeneratorService');
const ibmCosService = require('../src/services/ibmCosService');

// Actor data from users.json
const actors = [
  {
    id: 'user-001',
    username: 'maria_santos',
    name: 'Maria Santos',
    email: 'maria.santos@bank.ph',
    role: 'Relationship Manager'
  },
  {
    id: 'user-002',
    username: 'juan_delacruz',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@bank.ph',
    role: 'Credit Analyst'
  },
  {
    id: 'user-003',
    username: 'ana_reyes',
    name: 'Ana Reyes',
    email: 'ana.reyes@bank.ph',
    role: 'Credit Approver'
  },
  {
    id: 'user-004',
    username: 'admin',
    name: 'System Admin',
    email: 'admin@bank.ph',
    role: 'System Administrator'
  }
];

/**
 * Generate documents for a single actor
 * @param {Object} actor - Actor object
 * @returns {Promise<Object>} Generated document paths
 */
async function generateActorDocuments(actor) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generating documents for: ${actor.name} (${actor.username})`);
  console.log('='.repeat(60));

  try {
    const startTime = Date.now();

    // Generate all documents
    console.log('\n📄 Generating documents...');
    const documents = await documentGenerator.generateAllDocuments(actor);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n✅ Documents generated successfully!');
    console.log(`⏱️  Generation time: ${duration}s`);
    console.log('\nGenerated files:');
    Object.entries(documents).forEach(([type, filepath]) => {
      console.log(`  - ${type}: ${path.basename(filepath)}`);
    });

    return documents;
  } catch (error) {
    console.error(`\n❌ Error generating documents for ${actor.name}:`, error.message);
    throw error;
  }
}

/**
 * Upload documents to IBM COS
 * @param {Object} actor - Actor object
 * @param {Object} documentPaths - Generated document paths
 * @returns {Promise<Object>} Upload results
 */
async function uploadDocuments(actor, documentPaths) {
  console.log('\n☁️  Uploading documents to IBM Cloud Object Storage...');

  try {
    if (!ibmCosService.isConfigured()) {
      console.log('⚠️  IBM COS not configured. Skipping upload.');
      console.log('   Documents are saved locally in: backend/data/generated_documents/');
      return {
        success: false,
        message: 'IBM COS not configured',
        documents: {}
      };
    }

    const startTime = Date.now();
    const results = await ibmCosService.uploadActorDocuments(actor.username, documentPaths);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (results.success) {
      console.log(`\n✅ Upload completed successfully!`);
      console.log(`⏱️  Upload time: ${duration}s`);
      console.log(`📊 Uploaded ${results.successCount}/${results.totalFiles} documents`);
      
      console.log('\nUploaded files:');
      Object.entries(results.documents).forEach(([type, result]) => {
        if (result.success) {
          console.log(`  ✓ ${type}: ${result.url}`);
        } else {
          console.log(`  ✗ ${type}: ${result.error}`);
        }
      });
    } else {
      console.log(`\n⚠️  Upload completed with errors`);
      console.log(`📊 Uploaded ${results.successCount}/${results.totalFiles} documents`);
      console.log(`❌ Failed: ${results.failureCount} documents`);
    }

    return results;
  } catch (error) {
    console.error(`\n❌ Error uploading documents:`, error.message);
    return {
      success: false,
      message: error.message,
      documents: {}
    };
  }
}

/**
 * Generate summary report
 * @param {Array<Object>} results - Array of generation results
 */
function generateSummaryReport(results) {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 GENERATION SUMMARY REPORT');
  console.log('='.repeat(60));

  const totalActors = results.length;
  const successfulGenerations = results.filter(r => r.generationSuccess).length;
  const successfulUploads = results.filter(r => r.uploadSuccess).length;

  console.log(`\nTotal Actors: ${totalActors}`);
  console.log(`Successful Generations: ${successfulGenerations}/${totalActors}`);
  console.log(`Successful Uploads: ${successfulUploads}/${totalActors}`);

  console.log('\n📁 Document Types Generated (per actor):');
  console.log('  - Bank Statement (BDO Format)');
  console.log('  - Financial Statement (Audited)');
  console.log('  - ID/KYC Document (Philippine National ID)');
  console.log('  - Collateral Proof (Transfer Certificate of Title)');
  console.log('  - Business Registration (DTI Certificate)');
  console.log('  - Tax Return (BIR Form 1701)');

  const totalDocuments = successfulGenerations * 6;
  console.log(`\n📄 Total Documents Generated: ${totalDocuments}`);

  console.log('\n💾 Local Storage:');
  console.log('  Location: backend/data/generated_documents/');
  console.log('  Format: PDF');

  if (ibmCosService.isConfigured()) {
    console.log('\n☁️  Cloud Storage:');
    console.log(`  Service: IBM Cloud Object Storage`);
    console.log(`  Bucket: ${process.env.IBM_COS_BUCKET_NAME || 'loan-documents'}`);
    console.log(`  Uploaded: ${successfulUploads * 6} documents`);
  } else {
    console.log('\n⚠️  Cloud Storage: Not configured');
    console.log('  To enable IBM COS uploads, add credentials to .env:');
    console.log('    - IBM_COS_API_KEY');
    console.log('    - IBM_COS_INSTANCE_ID');
    console.log('    - IBM_COS_ENDPOINT');
    console.log('    - IBM_COS_BUCKET_NAME');
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution function
 */
async function main() {
  console.log('\n🚀 Starting Document Generation Process');
  console.log('📅 Date:', new Date().toISOString());
  console.log('👥 Actors:', actors.length);
  console.log('📄 Documents per actor: 6');
  console.log('📊 Total documents to generate:', actors.length * 6);

  const overallStartTime = Date.now();
  const results = [];

  // Generate documents for each actor
  for (const actor of actors) {
    try {
      // Generate documents
      const documentPaths = await generateActorDocuments(actor);

      // Upload to IBM COS
      const uploadResults = await uploadDocuments(actor, documentPaths);

      results.push({
        actor: actor.name,
        username: actor.username,
        generationSuccess: true,
        uploadSuccess: uploadResults.success,
        documentPaths,
        uploadResults
      });
    } catch (error) {
      console.error(`\n❌ Failed to process ${actor.name}:`, error.message);
      results.push({
        actor: actor.name,
        username: actor.username,
        generationSuccess: false,
        uploadSuccess: false,
        error: error.message
      });
    }
  }

  const overallEndTime = Date.now();
  const totalDuration = ((overallEndTime - overallStartTime) / 1000).toFixed(2);

  // Generate summary report
  generateSummaryReport(results);

  console.log(`\n⏱️  Total execution time: ${totalDuration}s`);
  console.log('✅ Document generation process completed!\n');

  // Save results to JSON file
  const resultsPath = path.join(__dirname, '../data/generation_results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`📝 Results saved to: ${resultsPath}\n`);
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateActorDocuments, uploadDocuments };

// Made with Bob