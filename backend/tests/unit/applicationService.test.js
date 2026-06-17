/**
 * Unit Tests for Application Service
 * Tests the core business logic for creating and managing loan applications
 */

const applicationService = require('../../src/services/applicationService');
const fileStorage = require('../../src/utils/fileStorage');
const auditService = require('../../src/services/auditService');

// Mock dependencies
jest.mock('../../src/utils/fileStorage');
jest.mock('../../src/services/auditService');

describe('ApplicationService - Create Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const mockUserId = 'user-123';
    const mockUserName = 'John Doe';
    const validApplicationData = {
      applicant: {
        legal_name: 'Test Business Inc.',
        business_type: 'Corporation',
        industry: 'Technology',
        years_in_business: 5
      },
      loan_request: {
        amount: 500000,
        tenor_months: 12,
        purpose: 'Business expansion',
        repayment_type: 'monthly'
      },
      financial_snapshot: {
        monthly_revenue: 200000,
        monthly_expenses: 150000,
        existing_debt_payment: 20000
      },
      collateral: {
        type: 'Real Estate',
        estimated_value: 1000000
      },
      owner_info: {
        name: 'John Smith',
        id_number: 'ID-12345',
        credit_score: 750
      }
    };

    test('should create a new application with valid data', async () => {
      // Mock existing applications for application number generation
      fileStorage.read.mockResolvedValue([
        { application_number: 'APP-2026-0001' }
      ]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      // Verify application structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('application_number');
      expect(result.application_number).toMatch(/^APP-\d{4}-\d{4}$/);
      expect(result.status).toBe('Draft');
      expect(result.owner_user_id).toBe(mockUserId);
      
      // Verify applicant data
      expect(result.applicant).toEqual(validApplicationData.applicant);
      
      // Verify loan request data
      expect(result.loan_request).toEqual(validApplicationData.loan_request);
      
      // Verify financial snapshot
      expect(result.financial_snapshot).toEqual(validApplicationData.financial_snapshot);
      
      // Verify collateral
      expect(result.collateral).toEqual(validApplicationData.collateral);
      
      // Verify owner info
      expect(result.owner_info).toEqual(validApplicationData.owner_info);
      
      // Verify timestamps
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
      expect(result.submitted_at).toBeNull();
      expect(result.completed_at).toBeNull();
      
      // Verify fileStorage.append was called
      expect(fileStorage.append).toHaveBeenCalledWith('applications', expect.objectContaining({
        id: expect.any(String),
        status: 'Draft'
      }));
      
      // Verify audit log was created
      expect(auditService.log).toHaveBeenCalledWith({
        actor_id: mockUserId,
        actor_name: mockUserName,
        action: auditService.ACTIONS.CREATE_APPLICATION,
        entity_type: 'Application',
        entity_id: result.id,
        after: result
      });
    });

    test('should generate unique application numbers', async () => {
      const year = new Date().getFullYear();
      fileStorage.read.mockResolvedValue([
        { application_number: `APP-${year}-0001` },
        { application_number: `APP-${year}-0002` }
      ]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(result.application_number).toBe(`APP-${year}-0003`);
    });

    test('should handle first application of the year', async () => {
      const year = new Date().getFullYear();
      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(result.application_number).toBe(`APP-${year}-0001`);
    });

    test('should set initial status to Draft', async () => {
      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(result.status).toBe('Draft');
    });

    test('should store owner_user_id correctly', async () => {
      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(result.owner_user_id).toBe(mockUserId);
    });

    test('should handle numeric values correctly', async () => {
      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(typeof result.applicant.years_in_business).toBe('number');
      expect(typeof result.loan_request.amount).toBe('number');
      expect(typeof result.loan_request.tenor_months).toBe('number');
      expect(typeof result.financial_snapshot.monthly_revenue).toBe('number');
      expect(typeof result.collateral.estimated_value).toBe('number');
      expect(typeof result.owner_info.credit_score).toBe('number');
    });

    test('should create timestamps in ISO format', async () => {
      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        validApplicationData,
        mockUserId,
        mockUserName
      );

      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should handle minimum valid values', async () => {
      const minimalData = {
        applicant: {
          legal_name: 'A',
          business_type: 'Sole Proprietorship',
          industry: 'Other',
          years_in_business: 0
        },
        loan_request: {
          amount: 1,
          tenor_months: 1,
          purpose: 'Test',
          repayment_type: 'monthly'
        },
        financial_snapshot: {
          monthly_revenue: 0,
          monthly_expenses: 0,
          existing_debt_payment: 0
        },
        collateral: {
          type: 'Other',
          estimated_value: 0
        },
        owner_info: {
          name: 'A',
          id_number: '1',
          credit_score: 300
        }
      };

      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        minimalData,
        mockUserId,
        mockUserName
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('Draft');
    });

    test('should handle large numeric values', async () => {
      const largeValueData = {
        ...validApplicationData,
        loan_request: {
          ...validApplicationData.loan_request,
          amount: 999999999
        },
        financial_snapshot: {
          monthly_revenue: 999999999,
          monthly_expenses: 999999999,
          existing_debt_payment: 999999999
        },
        collateral: {
          ...validApplicationData.collateral,
          estimated_value: 999999999
        }
      };

      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        largeValueData,
        mockUserId,
        mockUserName
      );

      expect(result.loan_request.amount).toBe(999999999);
      expect(result.financial_snapshot.monthly_revenue).toBe(999999999);
    });

    test('should handle special characters in text fields', async () => {
      const specialCharData = {
        ...validApplicationData,
        applicant: {
          ...validApplicationData.applicant,
          legal_name: "O'Brien & Sons, Inc. (Ñ)"
        },
        loan_request: {
          ...validApplicationData.loan_request,
          purpose: 'Expansion: 50% growth, $100K investment'
        }
      };

      fileStorage.read.mockResolvedValue([]);
      fileStorage.append.mockResolvedValue(true);
      auditService.log.mockResolvedValue(true);

      const result = await applicationService.create(
        specialCharData,
        mockUserId,
        mockUserName
      );

      expect(result.applicant.legal_name).toBe("O'Brien & Sons, Inc. (Ñ)");
      expect(result.loan_request.purpose).toBe('Expansion: 50% growth, $100K investment');
    });
  });

  describe('generateApplicationNumber()', () => {
    test('should generate correct format', async () => {
      fileStorage.read.mockResolvedValue([]);
      
      const appNumber = await applicationService.generateApplicationNumber();
      
      expect(appNumber).toMatch(/^APP-\d{4}-\d{4}$/);
    });

    test('should increment counter correctly', async () => {
      const year = new Date().getFullYear();
      fileStorage.read.mockResolvedValue([
        { application_number: `APP-${year}-0001` },
        { application_number: `APP-${year}-0002` },
        { application_number: `APP-${year}-0003` }
      ]);
      
      const appNumber = await applicationService.generateApplicationNumber();
      
      expect(appNumber).toBe(`APP-${year}-0004`);
    });

    test('should pad numbers with leading zeros', async () => {
      const year = new Date().getFullYear();
      fileStorage.read.mockResolvedValue([
        { application_number: `APP-${year}-0001` }
      ]);
      
      const appNumber = await applicationService.generateApplicationNumber();
      
      expect(appNumber).toBe(`APP-${year}-0002`);
      expect(appNumber.split('-')[2]).toHaveLength(4);
    });

    test('should only count applications from current year', async () => {
      const year = new Date().getFullYear();
      const lastYear = year - 1;
      fileStorage.read.mockResolvedValue([
        { application_number: `APP-${lastYear}-0099` },
        { application_number: `APP-${year}-0001` }
      ]);
      
      const appNumber = await applicationService.generateApplicationNumber();
      
      expect(appNumber).toBe(`APP-${year}-0002`);
    });
  });
});

// Made with Bob
