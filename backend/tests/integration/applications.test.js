/**
 * Integration Tests for Application API Endpoints
 * Tests the complete flow of creating applications through the REST API
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies BEFORE requiring the router
jest.mock('../../src/utils/fileStorage');
jest.mock('../../src/services/auditService');
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-123', name: 'Test User', role: 'RM' };
    next();
  }),
  authorize: jest.fn((...roles) => (req, res, next) => next())
}));

// Now require the router after mocks are set up
const applicationsRouter = require('../../src/routes/applications');
const fileStorage = require('../../src/utils/fileStorage');
const auditService = require('../../src/services/auditService');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/applications', applicationsRouter);

describe('POST /api/applications - Create Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fileStorage.read.mockResolvedValue([]);
    fileStorage.append.mockResolvedValue(true);
    auditService.log.mockResolvedValue(true);
  });

  const validApplicationPayload = {
    applicant: {
      legal_name: 'Tech Solutions Inc.',
      business_type: 'Corporation',
      industry: 'Technology',
      years_in_business: 5
    },
    loan_request: {
      amount: 500000,
      tenor_months: 12,
      purpose: 'Business expansion and equipment purchase',
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
      id_number: 'ID-12345678',
      credit_score: 750
    }
  };

  describe('Successful Creation', () => {
    test('should create application with 201 status', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send(validApplicationPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('application_number');
      expect(response.body.status).toBe('Draft');
    });

    test('should return complete application object', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send(validApplicationPayload)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        application_number: expect.stringMatching(/^APP-\d{4}-\d{4}$/),
        status: 'Draft',
        owner_user_id: 'test-user-123',
        applicant: validApplicationPayload.applicant,
        loan_request: validApplicationPayload.loan_request,
        financial_snapshot: validApplicationPayload.financial_snapshot,
        collateral: validApplicationPayload.collateral,
        owner_info: validApplicationPayload.owner_info,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        submitted_at: null,
        completed_at: null
      });
    });

    test('should accept all valid business types', async () => {
      const businessTypes = ['Sole Proprietorship', 'Partnership', 'Corporation', 'Cooperative'];

      for (const businessType of businessTypes) {
        const payload = {
          ...validApplicationPayload,
          applicant: {
            ...validApplicationPayload.applicant,
            business_type: businessType
          }
        };

        const response = await request(app)
          .post('/api/applications')
          .send(payload)
          .expect(201);

        expect(response.body.applicant.business_type).toBe(businessType);
      }
    });

    test('should accept all valid industries', async () => {
      const industries = ['Retail', 'Manufacturing', 'Services', 'Technology'];

      for (const industry of industries) {
        const payload = {
          ...validApplicationPayload,
          applicant: {
            ...validApplicationPayload.applicant,
            industry: industry
          }
        };

        const response = await request(app)
          .post('/api/applications')
          .send(payload)
          .expect(201);

        expect(response.body.applicant.industry).toBe(industry);
      }
    });

    test('should accept all valid repayment types', async () => {
      const repaymentTypes = ['monthly', 'quarterly', 'bullet'];

      for (const repaymentType of repaymentTypes) {
        const payload = {
          ...validApplicationPayload,
          loan_request: {
            ...validApplicationPayload.loan_request,
            repayment_type: repaymentType
          }
        };

        const response = await request(app)
          .post('/api/applications')
          .send(payload)
          .expect(201);

        expect(response.body.loan_request.repayment_type).toBe(repaymentType);
      }
    });

    test('should accept all valid collateral types', async () => {
      const collateralTypes = ['Real Estate', 'Vehicle', 'Equipment', 'Inventory'];

      for (const collateralType of collateralTypes) {
        const payload = {
          ...validApplicationPayload,
          collateral: {
            ...validApplicationPayload.collateral,
            type: collateralType
          }
        };

        const response = await request(app)
          .post('/api/applications')
          .send(payload)
          .expect(201);

        expect(response.body.collateral.type).toBe(collateralType);
      }
    });
  });

  describe('Validation Errors', () => {
    test('should reject missing legal_name', async () => {
      const payload = {
        ...validApplicationPayload,
        applicant: {
          ...validApplicationPayload.applicant,
          legal_name: ''
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Legal name is required'
          })
        ])
      );
    });

    test('should reject missing business_type', async () => {
      const payload = {
        ...validApplicationPayload,
        applicant: {
          ...validApplicationPayload.applicant,
          business_type: ''
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Business type is required'
          })
        ])
      );
    });

    test('should reject missing industry', async () => {
      const payload = {
        ...validApplicationPayload,
        applicant: {
          ...validApplicationPayload.applicant,
          industry: ''
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Industry is required'
          })
        ])
      );
    });

    test('should reject non-numeric years_in_business', async () => {
      const payload = {
        ...validApplicationPayload,
        applicant: {
          ...validApplicationPayload.applicant,
          years_in_business: 'five'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Years in business must be a number'
          })
        ])
      );
    });

    test('should reject non-numeric loan amount', async () => {
      const payload = {
        ...validApplicationPayload,
        loan_request: {
          ...validApplicationPayload.loan_request,
          amount: 'five hundred thousand'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Loan amount must be a number'
          })
        ])
      );
    });

    test('should reject non-numeric tenor', async () => {
      const payload = {
        ...validApplicationPayload,
        loan_request: {
          ...validApplicationPayload.loan_request,
          tenor_months: 'twelve'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Tenor must be a number'
          })
        ])
      );
    });

    test('should reject missing loan purpose', async () => {
      const payload = {
        ...validApplicationPayload,
        loan_request: {
          ...validApplicationPayload.loan_request,
          purpose: ''
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Loan purpose is required'
          })
        ])
      );
    });

    test('should reject non-numeric monthly_revenue', async () => {
      const payload = {
        ...validApplicationPayload,
        financial_snapshot: {
          ...validApplicationPayload.financial_snapshot,
          monthly_revenue: 'two hundred thousand'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Monthly revenue must be a number'
          })
        ])
      );
    });

    test('should reject non-numeric monthly_expenses', async () => {
      const payload = {
        ...validApplicationPayload,
        financial_snapshot: {
          ...validApplicationPayload.financial_snapshot,
          monthly_expenses: 'invalid'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Monthly expenses must be a number'
          })
        ])
      );
    });

    test('should reject non-numeric collateral value', async () => {
      const payload = {
        ...validApplicationPayload,
        collateral: {
          ...validApplicationPayload.collateral,
          estimated_value: 'one million'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Collateral value must be a number'
          })
        ])
      );
    });

    test('should reject non-numeric credit_score', async () => {
      const payload = {
        ...validApplicationPayload,
        owner_info: {
          ...validApplicationPayload.owner_info,
          credit_score: 'excellent'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Credit score must be a number'
          })
        ])
      );
    });

    test('should reject multiple validation errors', async () => {
      const payload = {
        applicant: {
          legal_name: '',
          business_type: '',
          industry: '',
          years_in_business: 'invalid'
        },
        loan_request: {
          amount: 'invalid',
          tenor_months: 'invalid',
          purpose: '',
          repayment_type: 'monthly'
        },
        financial_snapshot: {
          monthly_revenue: 'invalid',
          monthly_expenses: 'invalid',
          existing_debt_payment: 0
        },
        collateral: {
          type: 'Real Estate',
          estimated_value: 'invalid'
        },
        owner_info: {
          name: 'John',
          id_number: '123',
          credit_score: 'invalid'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases', () => {
    test('should accept zero values for financial fields', async () => {
      const payload = {
        ...validApplicationPayload,
        financial_snapshot: {
          monthly_revenue: 0,
          monthly_expenses: 0,
          existing_debt_payment: 0
        },
        collateral: {
          ...validApplicationPayload.collateral,
          estimated_value: 0
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.financial_snapshot.monthly_revenue).toBe(0);
      expect(response.body.collateral.estimated_value).toBe(0);
    });

    test('should accept very large loan amounts', async () => {
      const payload = {
        ...validApplicationPayload,
        loan_request: {
          ...validApplicationPayload.loan_request,
          amount: 999999999
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.loan_request.amount).toBe(999999999);
    });

    test('should accept minimum credit score', async () => {
      const payload = {
        ...validApplicationPayload,
        owner_info: {
          ...validApplicationPayload.owner_info,
          credit_score: 300
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.owner_info.credit_score).toBe(300);
    });

    test('should accept maximum credit score', async () => {
      const payload = {
        ...validApplicationPayload,
        owner_info: {
          ...validApplicationPayload.owner_info,
          credit_score: 850
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.owner_info.credit_score).toBe(850);
    });

    test('should handle special characters in text fields', async () => {
      const payload = {
        ...validApplicationPayload,
        applicant: {
          ...validApplicationPayload.applicant,
          legal_name: "O'Brien & Sons, Inc. (Ñ)"
        },
        loan_request: {
          ...validApplicationPayload.loan_request,
          purpose: 'Expansion: 50% growth, $100K investment'
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.applicant.legal_name).toBe("O'Brien & Sons, Inc. (Ñ)");
      expect(response.body.loan_request.purpose).toBe('Expansion: 50% growth, $100K investment');
    });

    test('should handle very long text in purpose field', async () => {
      const longPurpose = 'A'.repeat(1000);
      const payload = {
        ...validApplicationPayload,
        loan_request: {
          ...validApplicationPayload.loan_request,
          purpose: longPurpose
        }
      };

      const response = await request(app)
        .post('/api/applications')
        .send(payload)
        .expect(201);

      expect(response.body.loan_request.purpose).toBe(longPurpose);
    });
  });

  describe('Content-Type Handling', () => {
    test('should accept application/json content type', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Content-Type', 'application/json')
        .send(validApplicationPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    test('should reject invalid JSON', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});

// Made with Bob
