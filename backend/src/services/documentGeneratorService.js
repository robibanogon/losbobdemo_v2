/**
 * @fileoverview Document Generator Service
 * @module services/documentGeneratorService
 * @description Generates realistic Philippine-format documents for loan applications
 */

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

/**
 * Document Generator Service Class
 * Generates PDF documents in Philippine bank and government formats
 * @class
 */
class DocumentGeneratorService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../data/generated_documents');
  }

  /**
   * Ensure output directory exists
   * @async
   * @private
   */
  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Format currency in Philippine Peso
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatPeso(amount) {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Generate Bank Statement (BDO Format)
   * @async
   * @param {Object} actor - User actor object
   * @param {string} accountNumber - Bank account number
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateBankStatement(actor, accountNumber) {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_BankStatement.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Header - BDO Logo and Bank Name
    doc.fontSize(18).font('Helvetica-Bold').text('BANCO DE ORO UNIBANK, INC.', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('BDO Corporate Center, 7899 Makati Avenue', { align: 'center' });
    doc.text('Makati City, Metro Manila 1226, Philippines', { align: 'center' });
    doc.text('Tel: (632) 8631-8000 | www.bdo.com.ph', { align: 'center' });
    doc.moveDown(2);

    // Statement Title
    doc.fontSize(14).font('Helvetica-Bold').text('STATEMENT OF ACCOUNT', { align: 'center' });
    doc.moveDown(1.5);

    // Account Information Box
    doc.fontSize(10).font('Helvetica');
    const startY = doc.y;
    doc.rect(50, startY, 500, 100).stroke();
    
    doc.text(`Account Name: ${actor.name}`, 60, startY + 10);
    doc.text(`Account Number: ${accountNumber}`, 60, startY + 30);
    doc.text(`Account Type: Savings Account`, 60, startY + 50);
    doc.text(`Statement Period: January 1, 2026 - March 31, 2026`, 60, startY + 70);
    
    doc.moveDown(7);

    // Transaction Header
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('TRANSACTION HISTORY', { underline: true });
    doc.moveDown(0.5);

    // Table Header
    doc.fontSize(9).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('Date', 50, tableTop);
    doc.text('Description', 120, tableTop);
    doc.text('Debit', 320, tableTop);
    doc.text('Credit', 400, tableTop);
    doc.text('Balance', 480, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.moveDown(1);

    // Sample Transactions
    const transactions = [
      { date: '01/05/26', desc: 'Beginning Balance', debit: '', credit: '', balance: 125000 },
      { date: '01/15/26', desc: 'Salary Deposit - Payroll', debit: '', credit: 75000, balance: 200000 },
      { date: '01/20/26', desc: 'Meralco Payment', debit: 3500, credit: '', balance: 196500 },
      { date: '01/25/26', desc: 'Manila Water Payment', debit: 1200, credit: '', balance: 195300 },
      { date: '02/01/26', desc: 'ATM Withdrawal - Makati', debit: 10000, credit: '', balance: 185300 },
      { date: '02/15/26', desc: 'Salary Deposit - Payroll', debit: '', credit: 75000, balance: 260300 },
      { date: '02/20/26', desc: 'Credit Card Payment', debit: 15000, credit: '', balance: 245300 },
      { date: '03/01/26', desc: 'Online Transfer - GCash', debit: 5000, credit: '', balance: 240300 },
      { date: '03/15/26', desc: 'Salary Deposit - Payroll', debit: '', credit: 75000, balance: 315300 },
      { date: '03/25/26', desc: 'Rent Payment', debit: 25000, credit: '', balance: 290300 }
    ];

    doc.fontSize(8).font('Helvetica');
    transactions.forEach(txn => {
      const y = doc.y;
      doc.text(txn.date, 50, y);
      doc.text(txn.desc, 120, y, { width: 180 });
      doc.text(txn.debit ? this.formatPeso(txn.debit) : '', 320, y);
      doc.text(txn.credit ? this.formatPeso(txn.credit) : '', 400, y);
      doc.text(this.formatPeso(txn.balance), 480, y);
      doc.moveDown(0.8);
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('SUMMARY', 50);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Beginning Balance: ${this.formatPeso(125000)}`, 50);
    doc.text(`Total Credits: ${this.formatPeso(225000)}`, 50);
    doc.text(`Total Debits: ${this.formatPeso(59700)}`, 50);
    doc.text(`Ending Balance: ${this.formatPeso(290300)}`, 50);
    doc.moveDown(1);
    doc.text(`Average Daily Balance: ${this.formatPeso(245000)}`, 50);

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).font('Helvetica');
    doc.text('This is a computer-generated statement and does not require a signature.', { align: 'center' });
    doc.text('For inquiries, please call BDO Customer Service at (632) 8631-8000', { align: 'center' });
    doc.text('or visit your nearest BDO branch.', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate Financial Statement
   * @async
   * @param {Object} actor - User actor object
   * @param {string} businessName - Business name
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateFinancialStatement(actor, businessName) {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_FinancialStatement.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(businessName, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('AUDITED FINANCIAL STATEMENTS', { align: 'center' });
    doc.fontSize(10).text('For the Year Ended December 31, 2025', { align: 'center' });
    doc.moveDown(2);

    // Statement of Financial Position
    doc.fontSize(14).font('Helvetica-Bold').text('STATEMENT OF FINANCIAL POSITION');
    doc.fontSize(10).font('Helvetica').text('As of December 31, 2025');
    doc.moveDown(1);

    // Assets
    doc.fontSize(11).font('Helvetica-Bold').text('ASSETS');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    doc.text('Current Assets:', 50);
    doc.text('Cash and Cash Equivalents', 70);
    doc.text(this.formatPeso(1500000), 400, doc.y - 12);
    doc.text('Accounts Receivable', 70);
    doc.text(this.formatPeso(2500000), 400, doc.y - 12);
    doc.text('Inventory', 70);
    doc.text(this.formatPeso(1800000), 400, doc.y - 12);
    doc.text('Prepaid Expenses', 70);
    doc.text(this.formatPeso(200000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Current Assets', 70);
    doc.text(this.formatPeso(6000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.font('Helvetica').text('Non-Current Assets:', 50);
    doc.text('Property, Plant & Equipment', 70);
    doc.text(this.formatPeso(8000000), 400, doc.y - 12);
    doc.text('Less: Accumulated Depreciation', 70);
    doc.text(this.formatPeso(2000000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Non-Current Assets', 70);
    doc.text(this.formatPeso(6000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('TOTAL ASSETS', 50);
    doc.text(this.formatPeso(12000000), 400, doc.y - 12);
    doc.moveDown(1);

    // Liabilities
    doc.fontSize(11).font('Helvetica-Bold').text('LIABILITIES AND EQUITY');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    doc.text('Current Liabilities:', 50);
    doc.text('Accounts Payable', 70);
    doc.text(this.formatPeso(1500000), 400, doc.y - 12);
    doc.text('Short-term Loans', 70);
    doc.text(this.formatPeso(1000000), 400, doc.y - 12);
    doc.text('Accrued Expenses', 70);
    doc.text(this.formatPeso(500000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Current Liabilities', 70);
    doc.text(this.formatPeso(3000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.font('Helvetica').text('Non-Current Liabilities:', 50);
    doc.text('Long-term Loans', 70);
    doc.text(this.formatPeso(2000000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Liabilities', 70);
    doc.text(this.formatPeso(5000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.font('Helvetica').text('Equity:', 50);
    doc.text('Capital Stock', 70);
    doc.text(this.formatPeso(5000000), 400, doc.y - 12);
    doc.text('Retained Earnings', 70);
    doc.text(this.formatPeso(2000000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Equity', 70);
    doc.text(this.formatPeso(7000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('TOTAL LIABILITIES AND EQUITY', 50);
    doc.text(this.formatPeso(12000000), 400, doc.y - 12);

    // New Page for Income Statement
    doc.addPage();
    
    doc.fontSize(14).font('Helvetica-Bold').text('STATEMENT OF COMPREHENSIVE INCOME');
    doc.fontSize(10).font('Helvetica').text('For the Year Ended December 31, 2025');
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.text('Revenue', 50);
    doc.text(this.formatPeso(15000000), 400, doc.y - 12);
    doc.text('Cost of Sales', 50);
    doc.text(this.formatPeso(9000000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Gross Profit', 50);
    doc.text(this.formatPeso(6000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.font('Helvetica').text('Operating Expenses:', 50);
    doc.text('Salaries and Wages', 70);
    doc.text(this.formatPeso(2000000), 400, doc.y - 12);
    doc.text('Rent', 70);
    doc.text(this.formatPeso(600000), 400, doc.y - 12);
    doc.text('Utilities', 70);
    doc.text(this.formatPeso(300000), 400, doc.y - 12);
    doc.text('Depreciation', 70);
    doc.text(this.formatPeso(500000), 400, doc.y - 12);
    doc.text('Other Operating Expenses', 70);
    doc.text(this.formatPeso(600000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Operating Expenses', 70);
    doc.text(this.formatPeso(4000000), 400, doc.y - 12);
    doc.moveDown(0.5);

    doc.text('Operating Income', 50);
    doc.text(this.formatPeso(2000000), 400, doc.y - 12);
    doc.font('Helvetica').text('Interest Expense', 50);
    doc.text(this.formatPeso(200000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Net Income Before Tax', 50);
    doc.text(this.formatPeso(1800000), 400, doc.y - 12);
    doc.font('Helvetica').text('Income Tax Expense', 50);
    doc.text(this.formatPeso(540000), 400, doc.y - 12);
    doc.fontSize(12).font('Helvetica-Bold').text('NET INCOME', 50);
    doc.text(this.formatPeso(1260000), 400, doc.y - 14);

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).font('Helvetica');
    doc.text('Prepared by: CPA Firm Name', 50);
    doc.text('Date: January 15, 2026', 50);
    doc.text('These financial statements have been audited in accordance with Philippine Standards on Auditing.', 50);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate ID/KYC Document (Philippine National ID format)
   * @async
   * @param {Object} actor - User actor object
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateIDDocument(actor) {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_ID_KYC.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PHILIPPINE IDENTIFICATION SYSTEM', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Philippine National ID', { align: 'center' });
    doc.moveDown(2);

    // ID Card Simulation
    const cardTop = doc.y;
    doc.rect(100, cardTop, 400, 250).stroke();
    
    // Front of ID
    doc.fontSize(10).font('Helvetica-Bold').text('REPUBLIKA NG PILIPINAS', 120, cardTop + 20);
    doc.fontSize(8).font('Helvetica').text('Philippine Statistics Authority', 120, cardTop + 35);
    doc.moveDown(3);

    // Photo placeholder
    doc.rect(120, cardTop + 60, 80, 100).stroke();
    doc.fontSize(8).text('PHOTO', 140, cardTop + 105);

    // Personal Information
    doc.fontSize(10).font('Helvetica-Bold').text('Personal Information:', 220, cardTop + 60);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Full Name: ${actor.name}`, 220, cardTop + 80);
    doc.text(`PSN: ${this.generatePSN()}`, 220, cardTop + 95);
    doc.text(`Date of Birth: January 15, 1985`, 220, cardTop + 110);
    doc.text(`Sex: ${Math.random() > 0.5 ? 'Male' : 'Female'}`, 220, cardTop + 125);
    doc.text(`Blood Type: O+`, 220, cardTop + 140);
    
    doc.fontSize(8).font('Helvetica');
    doc.text(`Address: 123 Makati Avenue`, 120, cardTop + 175);
    doc.text(`Makati City, Metro Manila 1200`, 120, cardTop + 190);
    doc.text(`Date Issued: January 1, 2024`, 120, cardTop + 210);
    doc.text(`Valid Until: January 1, 2034`, 120, cardTop + 225);

    doc.moveDown(18);

    // Additional KYC Information
    doc.fontSize(12).font('Helvetica-Bold').text('KNOW YOUR CUSTOMER (KYC) INFORMATION');
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`TIN: ${this.generateTIN()}`);
    doc.text(`SSS Number: ${this.generateSSS()}`);
    doc.text(`PhilHealth Number: ${this.generatePhilHealth()}`);
    doc.text(`Pag-IBIG Number: ${this.generatePagIBIG()}`);
    doc.moveDown(0.5);
    
    doc.text(`Citizenship: Filipino`);
    doc.text(`Civil Status: Single`);
    doc.text(`Occupation: ${actor.role}`);
    doc.text(`Employer: Philippine Banking Corporation`);
    doc.moveDown(0.5);
    
    doc.text(`Mobile Number: +63 917 123 4567`);
    doc.text(`Email Address: ${actor.email}`);
    doc.moveDown(1);

    // Verification Statement
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('VERIFICATION STATEMENT', { underline: true });
    doc.fontSize(8).font('Helvetica');
    doc.text('I hereby certify that the information provided above is true and correct to the best of my knowledge.');
    doc.text('I understand that any false information may result in the rejection of my application.');
    doc.moveDown(1);
    
    doc.text(`Signature: ___________________________`);
    doc.text(`Date: March 15, 2026`);

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).font('Helvetica');
    doc.text('This document is for loan application purposes only.', { align: 'center' });
    doc.text('Philippine Statistics Authority | www.psa.gov.ph', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate helper methods for Philippine ID numbers
   */
  generatePSN() {
    return `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  generateTIN() {
    return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  generateSSS() {
    return `${Math.floor(10 + Math.random() * 90)}-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1 + Math.random() * 9)}`;
  }

  generatePhilHealth() {
    return `${Math.floor(10 + Math.random() * 90)}-${Math.floor(100000000 + Math.random() * 900000000)}-${Math.floor(1 + Math.random() * 9)}`;
  }

  generatePagIBIG() {
    return `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  /**
   * Generate Collateral Proof Document
   * @async
   * @param {Object} actor - User actor object
   * @param {string} propertyType - Type of property (Residential/Commercial)
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateCollateralProof(actor, propertyType = 'Residential') {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_CollateralProof.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('CERTIFICATE OF TITLE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('REPUBLIC OF THE PHILIPPINES', { align: 'center' });
    doc.fontSize(10).text('REGISTRY OF DEEDS FOR MAKATI CITY', { align: 'center' });
    doc.moveDown(2);

    // Title Information Box
    const boxTop = doc.y;
    doc.rect(50, boxTop, 500, 120).stroke();
    
    doc.fontSize(11).font('Helvetica-Bold').text('TRANSFER CERTIFICATE OF TITLE', 60, boxTop + 10);
    doc.fontSize(10).font('Helvetica');
    doc.text(`TCT No.: ${Math.floor(100000 + Math.random() * 900000)}`, 60, boxTop + 30);
    doc.text(`Property Type: ${propertyType} Property`, 60, boxTop + 50);
    doc.text(`Location: Makati City, Metro Manila`, 60, boxTop + 70);
    doc.text(`Issue Date: January 15, 2020`, 60, boxTop + 90);
    
    doc.moveDown(9);

    // Property Details
    doc.fontSize(12).font('Helvetica-Bold').text('PROPERTY DETAILS');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    doc.text(`Lot Number: ${Math.floor(1 + Math.random() * 999)}`);
    doc.text(`Block Number: ${Math.floor(1 + Math.random() * 50)}`);
    doc.text(`Survey Number: Psd-${Math.floor(100000 + Math.random() * 900000)}`);
    doc.text(`Land Area: ${Math.floor(100 + Math.random() * 400)} square meters`);
    doc.text(`Floor Area: ${Math.floor(80 + Math.random() * 300)} square meters`);
    doc.moveDown(0.5);
    
    doc.text(`Address: ${Math.floor(100 + Math.random() * 900)} Ayala Avenue`);
    doc.text(`Barangay: Poblacion, Makati City`);
    doc.text(`Metro Manila, Philippines 1200`);
    doc.moveDown(1);

    // Registered Owner
    doc.fontSize(12).font('Helvetica-Bold').text('REGISTERED OWNER');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${actor.name}`);
    doc.text(`Citizenship: Filipino`);
    doc.text(`Civil Status: Single`);
    doc.text(`TIN: ${this.generateTIN()}`);
    doc.moveDown(1);

    // Property Valuation
    doc.fontSize(12).font('Helvetica-Bold').text('PROPERTY VALUATION');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    const marketValue = Math.floor(5000000 + Math.random() * 10000000);
    const assessedValue = Math.floor(marketValue * 0.7);
    doc.text(`Market Value: ${this.formatPeso(marketValue)}`);
    doc.text(`Assessed Value: ${this.formatPeso(assessedValue)}`);
    doc.text(`Tax Declaration No.: ${Math.floor(2020 + Math.random() * 6)}-${Math.floor(10000 + Math.random() * 90000)}`);
    doc.moveDown(1);

    // Encumbrances
    doc.fontSize(12).font('Helvetica-Bold').text('ENCUMBRANCES');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('None - Property is free from all liens and encumbrances');
    doc.moveDown(1);

    // Technical Description
    doc.fontSize(12).font('Helvetica-Bold').text('TECHNICAL DESCRIPTION');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('A parcel of land situated in the Barangay of Poblacion, City of Makati,');
    doc.text('Province of Metro Manila, Island of Luzon, Philippines.');
    doc.text('Bounded on the North by Lot 123; on the East by Ayala Avenue;');
    doc.text('on the South by Lot 125; and on the West by Lot 122.');
    doc.moveDown(1);

    // Certification
    doc.fontSize(10).font('Helvetica-Bold').text('CERTIFICATION');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text('This is to certify that the above property is registered in the name of the');
    doc.text('registered owner as indicated above and is free from all liens and encumbrances');
    doc.text('as of the date of this certificate.');
    doc.moveDown(2);

    doc.text('_________________________________');
    doc.text('Register of Deeds');
    doc.text('Makati City, Metro Manila');
    doc.text(`Date: March 15, 2026`);

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).font('Helvetica');
    doc.text('This document is issued for loan collateral purposes.', { align: 'center' });
    doc.text('Registry of Deeds - Makati City | Land Registration Authority', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate Business Registration (DTI/SEC Format)
   * @async
   * @param {Object} actor - User actor object
   * @param {string} businessName - Business name
   * @param {string} registrationType - DTI or SEC
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateBusinessRegistration(actor, businessName, registrationType = 'DTI') {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_BusinessRegistration.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    if (registrationType === 'DTI') {
      // DTI Certificate
      doc.fontSize(16).font('Helvetica-Bold').text('DEPARTMENT OF TRADE AND INDUSTRY', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('CERTIFICATE OF BUSINESS NAME REGISTRATION', { align: 'center' });
      doc.moveDown(2);

      // Certificate Box
      const boxTop = doc.y;
      doc.rect(50, boxTop, 500, 150).stroke();
      
      doc.fontSize(10).font('Helvetica-Bold').text('CERTIFICATE NO.:', 60, boxTop + 15);
      doc.font('Helvetica').text(`DTI-NCR-${Math.floor(1000000 + Math.random() * 9000000)}`, 200, boxTop + 15);
      
      doc.font('Helvetica-Bold').text('BUSINESS NAME:', 60, boxTop + 35);
      doc.font('Helvetica').text(businessName, 200, boxTop + 35);
      
      doc.font('Helvetica-Bold').text('OWNER:', 60, boxTop + 55);
      doc.font('Helvetica').text(actor.name, 200, boxTop + 55);
      
      doc.font('Helvetica-Bold').text('BUSINESS ADDRESS:', 60, boxTop + 75);
      doc.font('Helvetica').text('123 Makati Avenue, Makati City', 200, boxTop + 75);
      doc.text('Metro Manila 1200, Philippines', 200, boxTop + 90);
      
      doc.font('Helvetica-Bold').text('DATE REGISTERED:', 60, boxTop + 110);
      doc.font('Helvetica').text('January 15, 2024', 200, boxTop + 110);
      
      doc.font('Helvetica-Bold').text('VALID UNTIL:', 60, boxTop + 130);
      doc.font('Helvetica').text('January 14, 2029', 200, boxTop + 130);
      
      doc.moveDown(12);

      // Business Details
      doc.fontSize(11).font('Helvetica-Bold').text('BUSINESS DETAILS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Nature of Business: Trading and Services`);
      doc.text(`Line of Business: General Merchandise`);
      doc.text(`Capital Investment: ${this.formatPeso(500000)}`);
      doc.text(`TIN: ${this.generateTIN()}`);
      doc.moveDown(1);

      // Owner Information
      doc.fontSize(11).font('Helvetica-Bold').text('OWNER INFORMATION');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Full Name: ${actor.name}`);
      doc.text(`Citizenship: Filipino`);
      doc.text(`Address: 123 Makati Avenue, Makati City`);
      doc.text(`Contact Number: +63 917 123 4567`);
      doc.text(`Email: ${actor.email}`);
      doc.moveDown(2);

      // Certification
      doc.fontSize(9).font('Helvetica');
      doc.text('This is to certify that the business name stated above has been duly registered');
      doc.text('with the Department of Trade and Industry in accordance with Republic Act No. 3883.');
      doc.moveDown(2);

      doc.text('_________________________________');
      doc.text('DTI Business Registration Officer');
      doc.text('Department of Trade and Industry - NCR');
      doc.text('Date: January 15, 2024');

    } else {
      // SEC Certificate
      doc.fontSize(16).font('Helvetica-Bold').text('SECURITIES AND EXCHANGE COMMISSION', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('CERTIFICATE OF INCORPORATION', { align: 'center' });
      doc.moveDown(2);

      // Certificate Box
      const boxTop = doc.y;
      doc.rect(50, boxTop, 500, 180).stroke();
      
      doc.fontSize(10).font('Helvetica-Bold').text('SEC REGISTRATION NO.:', 60, boxTop + 15);
      doc.font('Helvetica').text(`CS${Math.floor(202400000 + Math.random() * 99999)}`, 220, boxTop + 15);
      
      doc.font('Helvetica-Bold').text('COMPANY NAME:', 60, boxTop + 35);
      doc.font('Helvetica').text(`${businessName} Corporation`, 220, boxTop + 35);
      
      doc.font('Helvetica-Bold').text('CORPORATE TYPE:', 60, boxTop + 55);
      doc.font('Helvetica').text('Stock Corporation', 220, boxTop + 55);
      
      doc.font('Helvetica-Bold').text('AUTHORIZED CAPITAL:', 60, boxTop + 75);
      doc.font('Helvetica').text(this.formatPeso(5000000), 220, boxTop + 75);
      
      doc.font('Helvetica-Bold').text('PAID-UP CAPITAL:', 60, boxTop + 95);
      doc.font('Helvetica').text(this.formatPeso(1250000), 220, boxTop + 95);
      
      doc.font('Helvetica-Bold').text('PRINCIPAL OFFICE:', 60, boxTop + 115);
      doc.font('Helvetica').text('123 Makati Avenue, Makati City', 220, boxTop + 115);
      doc.text('Metro Manila 1200, Philippines', 220, boxTop + 130);
      
      doc.font('Helvetica-Bold').text('DATE REGISTERED:', 60, boxTop + 150);
      doc.font('Helvetica').text('January 15, 2024', 220, boxTop + 150);
      
      doc.moveDown(14);

      // Corporate Officers
      doc.fontSize(11).font('Helvetica-Bold').text('CORPORATE OFFICERS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`President: ${actor.name}`);
      doc.text(`Secretary: Maria Santos`);
      doc.text(`Treasurer: Juan Dela Cruz`);
      doc.moveDown(1);

      // Business Purpose
      doc.fontSize(11).font('Helvetica-Bold').text('PRIMARY PURPOSE');
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      doc.text('To engage in trading, import, export, buy, sell, and deal in goods and merchandise');
      doc.text('of all kinds; to provide business consulting and management services; and to');
      doc.text('undertake all lawful business activities in the Philippines.');
      doc.moveDown(2);

      // Certification
      doc.fontSize(9).font('Helvetica');
      doc.text('This is to certify that the corporation named above has been duly registered');
      doc.text('with the Securities and Exchange Commission in accordance with the Corporation Code.');
      doc.moveDown(2);

      doc.text('_________________________________');
      doc.text('Director, Company Registration');
      doc.text('Securities and Exchange Commission');
      doc.text('Date: January 15, 2024');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).font('Helvetica');
    doc.text('This is a computer-generated certificate. Valid without signature.', { align: 'center' });
    doc.text(registrationType === 'DTI' ? 'DTI Hotline: 1-DTI (1-384) | www.dti.gov.ph' : 'SEC Hotline: (02) 8818-0921 | www.sec.gov.ph', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate Tax Return (BIR Format)
   * @async
   * @param {Object} actor - User actor object
   * @param {number} year - Tax year
   * @returns {Promise<string>} Path to generated PDF
   */
  async generateTaxReturn(actor, year = 2025) {
    await this.ensureOutputDir();
    
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${actor.username}_TaxReturn.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    const stream = require('fs').createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text('BUREAU OF INTERNAL REVENUE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('ANNUAL INCOME TAX RETURN', { align: 'center' });
    doc.fontSize(10).text(`BIR FORM 1701 - For Self-Employed and Mixed Income Earners`, { align: 'center' });
    doc.fontSize(9).text(`Taxable Year: ${year}`, { align: 'center' });
    doc.moveDown(2);

    // Taxpayer Information
    doc.fontSize(11).font('Helvetica-Bold').text('PART I - TAXPAYER INFORMATION');
    doc.moveDown(0.5);
    
    const infoTop = doc.y;
    doc.rect(50, infoTop, 500, 120).stroke();
    
    doc.fontSize(9).font('Helvetica');
    doc.text(`TIN: ${this.generateTIN()}`, 60, infoTop + 10);
    doc.text(`RDO Code: 047 - Makati City`, 300, infoTop + 10);
    
    doc.text(`Taxpayer Name: ${actor.name}`, 60, infoTop + 30);
    doc.text(`Trade/Business Name: ${actor.name} Enterprises`, 60, infoTop + 50);
    
    doc.text(`Registered Address:`, 60, infoTop + 70);
    doc.text(`123 Makati Avenue, Makati City`, 60, infoTop + 85);
    doc.text(`Metro Manila 1200, Philippines`, 60, infoTop + 100);
    
    doc.moveDown(9);

    // Income Details
    doc.fontSize(11).font('Helvetica-Bold').text('PART II - INCOME');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    
    const grossSales = 15000000;
    const costOfSales = 9000000;
    const grossIncome = grossSales - costOfSales;
    
    doc.text('Gross Sales/Receipts', 60);
    doc.text(this.formatPeso(grossSales), 400, doc.y - 12);
    doc.text('Less: Cost of Sales', 60);
    doc.text(this.formatPeso(costOfSales), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Gross Income from Business', 60);
    doc.text(this.formatPeso(grossIncome), 400, doc.y - 12);
    doc.moveDown(0.5);
    
    doc.font('Helvetica').text('Add: Other Income', 60);
    doc.text(this.formatPeso(200000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Total Gross Income', 60);
    doc.text(this.formatPeso(grossIncome + 200000), 400, doc.y - 12);
    doc.moveDown(1);

    // Deductions
    doc.fontSize(11).font('Helvetica-Bold').text('PART III - DEDUCTIONS');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    
    const deductions = {
      'Salaries and Wages': 2000000,
      'Rent': 600000,
      'Utilities': 300000,
      'Depreciation': 500000,
      'Professional Fees': 200000,
      'Taxes and Licenses': 150000,
      'Other Business Expenses': 250000
    };
    
    let totalDeductions = 0;
    Object.entries(deductions).forEach(([item, amount]) => {
      doc.text(item, 60);
      doc.text(this.formatPeso(amount), 400, doc.y - 12);
      totalDeductions += amount;
    });
    
    doc.font('Helvetica-Bold').text('Total Deductions', 60);
    doc.text(this.formatPeso(totalDeductions), 400, doc.y - 12);
    doc.moveDown(1);

    // Tax Computation
    doc.fontSize(11).font('Helvetica-Bold').text('PART IV - TAX COMPUTATION');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    
    const taxableIncome = grossIncome + 200000 - totalDeductions;
    const incomeTax = Math.floor(taxableIncome * 0.30); // 30% corporate tax
    
    doc.text('Taxable Income', 60);
    doc.text(this.formatPeso(taxableIncome), 400, doc.y - 12);
    doc.text('Income Tax Due (30%)', 60);
    doc.text(this.formatPeso(incomeTax), 400, doc.y - 12);
    doc.moveDown(0.5);
    
    doc.text('Less: Tax Credits/Payments', 60);
    doc.text(this.formatPeso(540000), 400, doc.y - 12);
    doc.font('Helvetica-Bold').text('Tax Still Due/(Overpayment)', 60);
    doc.text(this.formatPeso(incomeTax - 540000), 400, doc.y - 12);
    doc.moveDown(1);

    // Summary
    doc.fontSize(11).font('Helvetica-Bold').text('SUMMARY');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Total Gross Sales: ${this.formatPeso(grossSales)}`);
    doc.text(`Total Deductions: ${this.formatPeso(totalDeductions)}`);
    doc.text(`Taxable Income: ${this.formatPeso(taxableIncome)}`);
    doc.text(`Income Tax Due: ${this.formatPeso(incomeTax)}`);
    doc.moveDown(2);

    // Declaration
    doc.fontSize(9).font('Helvetica-Bold').text('DECLARATION');
    doc.fontSize(8).font('Helvetica');
    doc.text('I declare under the penalties of perjury that this return has been made in good faith,');
    doc.text('verified by me, and to the best of my knowledge and belief, is true and correct,');
    doc.text('pursuant to the provisions of the National Internal Revenue Code, as amended.');
    doc.moveDown(2);

    doc.text('_________________________________');
    doc.text('Signature of Taxpayer');
    doc.text(`Date Filed: February 15, ${year + 1}`);
    doc.moveDown(1);

    doc.text('_________________________________');
    doc.text('Signature of Tax Agent/Representative');
    doc.text('CPA License No.: 0123456');

    // Footer
    doc.moveDown(2);
    doc.fontSize(7).font('Helvetica');
    doc.text('This is a machine-validated return. No manual signature required.', { align: 'center' });
    doc.text('Bureau of Internal Revenue | BIR Hotline: 8538-3200 | www.bir.gov.ph', { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate all documents for an actor
   * @async
   * @param {Object} actor - User actor object
   * @returns {Promise<Object>} Object containing paths to all generated documents
   */
  async generateAllDocuments(actor) {
    const accountNumber = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const businessName = `${actor.name.split(' ')[0]} Enterprises`;
    
    const documents = {
      bankStatement: await this.generateBankStatement(actor, accountNumber),
      financialStatement: await this.generateFinancialStatement(actor, businessName),
      idDocument: await this.generateIDDocument(actor),
      collateralProof: await this.generateCollateralProof(actor, 'Residential'),
      businessRegistration: await this.generateBusinessRegistration(actor, businessName, 'DTI'),
      taxReturn: await this.generateTaxReturn(actor, 2025)
    };
    
    return documents;
  }
}

module.exports = new DocumentGeneratorService();

// Made with Bob