/**
 * End-to-End Test for Create Application Feature
 * Tests the live deployed application at the provided URL
 * Uses Puppeteer to simulate real user interactions
 */

const puppeteer = require('puppeteer');

// Test configuration
const BASE_URL = 'https://los-frontend-los-demo-v1.apps.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com';
const TEST_TIMEOUT = 60000; // 60 seconds

// Admin credentials for testing
const TEST_USER = {
  username: 'admin',
  password: 'password123'
};

// Test data
const testApplicationData = {
  applicantName: 'E2E Test Company Ltd.',
  businessType: 'Corporation',
  industry: 'Technology',
  yearsInBusiness: '5',
  loanAmount: '500000',
  tenor: '12',
  purpose: 'Business expansion and equipment purchase for E2E testing',
  repaymentType: 'monthly',
  monthlyRevenue: '200000',
  monthlyExpenses: '150000',
  existingDebtPayment: '20000',
  collateralType: 'Real Estate',
  collateralValue: '1000000',
  ownerName: 'John E2E Test',
  ownerIdNumber: 'E2E-TEST-12345',
  creditScore: '750'
};

describe('E2E: Create Application Feature', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true, // Set to false to see the browser
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Login before each test
    await loginAsAdmin(page);
  });

  /**
   * Helper function to login as admin
   */
  async function loginAsAdmin(page) {
    try {
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Wait for login form
      await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 5000 });

      // Fill login form
      const usernameInput = await page.$('input[name="username"]') || await page.$('input[type="text"]');
      if (usernameInput) {
        await usernameInput.type(TEST_USER.username);
      }

      const passwordInput = await page.$('input[name="password"]') || await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.type(TEST_USER.password);
      }

      // Submit login
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait for navigation after login
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log('Login attempt completed, proceeding with test...');
    }
  }

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Application Form Access', () => {
    test('should load the create application page', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Check if the page title is correct
      const title = await page.title();
      expect(title).toBeTruthy();

      // Check if the form is present
      const formExists = await page.$('form');
      expect(formExists).toBeTruthy();
    }, TEST_TIMEOUT);

    test('should display all form sections', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Check for section headings
      const sections = [
        'Applicant Information',
        'Loan Request',
        'Financial Snapshot',
        'Collateral',
        'Owner Information'
      ];

      for (const section of sections) {
        const sectionExists = await page.evaluate((text) => {
          return Array.from(document.querySelectorAll('h2, h3'))
            .some(el => el.textContent.includes(text));
        }, section);
        expect(sectionExists).toBe(true);
      }
    }, TEST_TIMEOUT);
  });

  describe('Form Field Validation', () => {
    beforeEach(async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });
    });

    test('should show validation for empty required fields', async () => {
      // Try to submit empty form
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Wait a bit for validation
        await page.waitForTimeout(1000);
        
        // Check if form is still on the same page (not submitted)
        const currentUrl = page.url();
        expect(currentUrl).toContain('/applications/new');
      }
    }, TEST_TIMEOUT);

    test('should accept valid input in all fields', async () => {
      // Fill Applicant Information
      await page.type('input[name="applicantName"]', testApplicationData.applicantName);
      await page.select('select[name="businessType"]', testApplicationData.businessType);
      await page.select('select[name="industry"]', testApplicationData.industry);
      await page.type('input[name="yearsInBusiness"]', testApplicationData.yearsInBusiness);

      // Fill Loan Request
      await page.type('input[name="loanAmount"]', testApplicationData.loanAmount);
      await page.type('input[name="tenor"]', testApplicationData.tenor);
      await page.type('textarea[name="purpose"]', testApplicationData.purpose);

      // Fill Financial Snapshot
      await page.type('input[name="monthlyRevenue"]', testApplicationData.monthlyRevenue);
      await page.type('input[name="monthlyExpenses"]', testApplicationData.monthlyExpenses);
      await page.type('input[name="existingDebtPayment"]', testApplicationData.existingDebtPayment);

      // Fill Collateral
      await page.select('select[name="collateralType"]', testApplicationData.collateralType);
      await page.type('input[name="collateralValue"]', testApplicationData.collateralValue);

      // Fill Owner Information
      await page.type('input[name="ownerName"]', testApplicationData.ownerName);
      await page.type('input[name="ownerIdNumber"]', testApplicationData.ownerIdNumber);
      await page.type('input[name="creditScore"]', testApplicationData.creditScore);

      // Verify all fields are filled
      const applicantName = await page.$eval('input[name="applicantName"]', el => el.value);
      expect(applicantName).toBe(testApplicationData.applicantName);
    }, TEST_TIMEOUT);
  });

  describe('Form Submission', () => {
    test('should successfully create a new application', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Fill all required fields
      await page.type('input[name="applicantName"]', testApplicationData.applicantName);
      await page.select('select[name="businessType"]', testApplicationData.businessType);
      await page.select('select[name="industry"]', testApplicationData.industry);
      await page.type('input[name="yearsInBusiness"]', testApplicationData.yearsInBusiness);

      await page.type('input[name="loanAmount"]', testApplicationData.loanAmount);
      await page.type('input[name="tenor"]', testApplicationData.tenor);
      await page.type('textarea[name="purpose"]', testApplicationData.purpose);

      await page.type('input[name="monthlyRevenue"]', testApplicationData.monthlyRevenue);
      await page.type('input[name="monthlyExpenses"]', testApplicationData.monthlyExpenses);
      await page.type('input[name="existingDebtPayment"]', testApplicationData.existingDebtPayment);

      await page.select('select[name="collateralType"]', testApplicationData.collateralType);
      await page.type('input[name="collateralValue"]', testApplicationData.collateralValue);

      await page.type('input[name="ownerName"]', testApplicationData.ownerName);
      await page.type('input[name="ownerIdNumber"]', testApplicationData.ownerIdNumber);
      await page.type('input[name="creditScore"]', testApplicationData.creditScore);

      // Submit the form
      const submitButton = await page.$('button[type="submit"]');
      await submitButton.click();

      // Wait for navigation or success message
      await page.waitForTimeout(3000);

      // Check if redirected to application detail page or success message appears
      const currentUrl = page.url();
      const isRedirected = currentUrl.includes('/applications/') && !currentUrl.includes('/new');
      
      if (isRedirected) {
        // Successfully created and redirected
        expect(isRedirected).toBe(true);
      } else {
        // Check for success message
        const successMessage = await page.evaluate(() => {
          return document.body.textContent.includes('success') || 
                 document.body.textContent.includes('created');
        });
        expect(successMessage).toBe(true);
      }
    }, TEST_TIMEOUT);

    test('should display created application details', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Fill and submit form
      await page.type('input[name="applicantName"]', testApplicationData.applicantName);
      await page.select('select[name="businessType"]', testApplicationData.businessType);
      await page.select('select[name="industry"]', testApplicationData.industry);
      await page.type('input[name="yearsInBusiness"]', testApplicationData.yearsInBusiness);

      await page.type('input[name="loanAmount"]', testApplicationData.loanAmount);
      await page.type('input[name="tenor"]', testApplicationData.tenor);
      await page.type('textarea[name="purpose"]', testApplicationData.purpose);

      await page.type('input[name="monthlyRevenue"]', testApplicationData.monthlyRevenue);
      await page.type('input[name="monthlyExpenses"]', testApplicationData.monthlyExpenses);
      await page.type('input[name="existingDebtPayment"]', testApplicationData.existingDebtPayment);

      await page.select('select[name="collateralType"]', testApplicationData.collateralType);
      await page.type('input[name="collateralValue"]', testApplicationData.collateralValue);

      await page.type('input[name="ownerName"]', testApplicationData.ownerName);
      await page.type('input[name="ownerIdNumber"]', testApplicationData.ownerIdNumber);
      await page.type('input[name="creditScore"]', testApplicationData.creditScore);

      const submitButton = await page.$('button[type="submit"]');
      await submitButton.click();

      // Wait for navigation
      await page.waitForTimeout(3000);

      // Check if application details are displayed
      const pageContent = await page.content();
      const hasApplicationNumber = pageContent.includes('APP-') || 
                                   await page.evaluate(() => {
                                     return document.body.textContent.match(/APP-\d{4}-\d{4}/);
                                   });
      
      expect(hasApplicationNumber).toBeTruthy();
    }, TEST_TIMEOUT);
  });

  describe('Form Navigation', () => {
    test('should have a back/cancel button', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      const backButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(btn => 
          btn.textContent.includes('Back') || 
          btn.textContent.includes('Cancel')
        );
      });

      expect(backButton).toBe(true);
    }, TEST_TIMEOUT);

    test('should navigate back when cancel is clicked', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Find and click cancel/back button
      const cancelButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent.includes('Back') || 
          btn.textContent.includes('Cancel')
        );
      });

      if (cancelButton) {
        await cancelButton.asElement().click();
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/applications/new');
      }
    }, TEST_TIMEOUT);
  });

  describe('Currency Formatting', () => {
    test('should format currency fields on blur', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      // Type in loan amount
      await page.type('input[name="loanAmount"]', '500000');
      
      // Click outside to trigger blur
      await page.click('body');
      await page.waitForTimeout(500);

      // Check if formatted
      const formattedValue = await page.$eval('input[name="loanAmount"]', el => el.value);
      
      // Should contain comma or be formatted
      const isFormatted = formattedValue.includes(',') || formattedValue.includes('500,000');
      expect(isFormatted).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Dropdown Options', () => {
    test('should have all business type options', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      const businessTypes = await page.$$eval('select[name="businessType"] option', options => 
        options.map(opt => opt.value).filter(v => v !== '')
      );

      expect(businessTypes.length).toBeGreaterThan(0);
      expect(businessTypes).toContain('Corporation');
    }, TEST_TIMEOUT);

    test('should have all industry options', async () => {
      await page.goto(`${BASE_URL}/applications/new`, {
        waitUntil: 'networkidle2',
        timeout: TEST_TIMEOUT
      });

      const industries = await page.$$eval('select[name="industry"] option', options => 
        options.map(opt => opt.value).filter(v => v !== '')
      );

      expect(industries.length).toBeGreaterThan(0);
      expect(industries).toContain('Technology');
    }, TEST_TIMEOUT);
  });
});

// Made with Bob
