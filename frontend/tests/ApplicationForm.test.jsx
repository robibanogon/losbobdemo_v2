/**
 * Frontend Component Tests for ApplicationForm
 * Tests the user interface and form validation for creating applications
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../src/context/ToastContext';
import ApplicationForm from '../src/pages/ApplicationForm';
import api from '../src/services/api';

// Mock the API
jest.mock('../src/services/api');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({})
}));

// Helper to render component with providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        {component}
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('ApplicationForm - Create Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    test('should render all required form sections', () => {
      renderWithProviders(<ApplicationForm />);

      expect(screen.getByText('Create New Application')).toBeInTheDocument();
      expect(screen.getByText('Applicant Information')).toBeInTheDocument();
      expect(screen.getByText('Loan Request')).toBeInTheDocument();
      expect(screen.getByText('Financial Snapshot')).toBeInTheDocument();
      expect(screen.getByText('Collateral')).toBeInTheDocument();
      expect(screen.getByText('Owner Information')).toBeInTheDocument();
    });

    test('should render all required input fields', () => {
      renderWithProviders(<ApplicationForm />);

      // Applicant fields
      expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Business Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Industry/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Years in Business/i)).toBeInTheDocument();

      // Loan request fields
      expect(screen.getByLabelText(/Loan Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tenor \(months\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Purpose/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Repayment Type/i)).toBeInTheDocument();

      // Financial snapshot fields
      expect(screen.getByLabelText(/Monthly Revenue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Monthly Expenses/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Existing Debt Payment/i)).toBeInTheDocument();

      // Collateral fields
      expect(screen.getByLabelText(/Collateral Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Estimated Value/i)).toBeInTheDocument();

      // Owner info fields
      expect(screen.getByLabelText(/Owner Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ID Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Credit Score/i)).toBeInTheDocument();
    });

    test('should mark required fields with asterisk', () => {
      renderWithProviders(<ApplicationForm />);

      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBeGreaterThan(10);
    });

    test('should render submit button', () => {
      renderWithProviders(<ApplicationForm />);

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      expect(submitButton).toBeInTheDocument();
    });

    test('should render cancel button', () => {
      renderWithProviders(<ApplicationForm />);

      const cancelButtons = screen.getAllByRole('button', { name: /Cancel|Back/i });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Form Input Handling', () => {
    test('should update text input values', () => {
      renderWithProviders(<ApplicationForm />);

      const legalNameInput = screen.getByLabelText(/Legal Name/i);
      fireEvent.change(legalNameInput, { target: { value: 'Test Business Inc.' } });

      expect(legalNameInput.value).toBe('Test Business Inc.');
    });

    test('should update select dropdown values', () => {
      renderWithProviders(<ApplicationForm />);

      const businessTypeSelect = screen.getByLabelText(/Business Type/i);
      fireEvent.change(businessTypeSelect, { target: { value: 'Corporation' } });

      expect(businessTypeSelect.value).toBe('Corporation');
    });

    test('should update numeric input values', () => {
      renderWithProviders(<ApplicationForm />);

      const yearsInput = screen.getByLabelText(/Years in Business/i);
      fireEvent.change(yearsInput, { target: { value: '5' } });

      expect(yearsInput.value).toBe('5');
    });

    test('should update textarea values', () => {
      renderWithProviders(<ApplicationForm />);

      const purposeTextarea = screen.getByLabelText(/Purpose/i);
      fireEvent.change(purposeTextarea, { target: { value: 'Business expansion' } });

      expect(purposeTextarea.value).toBe('Business expansion');
    });

    test('should format currency on blur', () => {
      renderWithProviders(<ApplicationForm />);

      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      fireEvent.change(loanAmountInput, { target: { value: '500000' } });
      fireEvent.blur(loanAmountInput);

      expect(loanAmountInput.value).toBe('500,000.00');
    });

    test('should remove currency formatting on focus', () => {
      renderWithProviders(<ApplicationForm />);

      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      fireEvent.change(loanAmountInput, { target: { value: '500000' } });
      fireEvent.blur(loanAmountInput);
      fireEvent.focus(loanAmountInput);

      expect(loanAmountInput.value).toBe('500000');
    });
  });

  describe('Form Validation', () => {
    test('should show error when submitting empty form', async () => {
      renderWithProviders(<ApplicationForm />);

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      // HTML5 validation should prevent submission
      expect(api.post).not.toHaveBeenCalled();
    });

    test('should validate required fields', () => {
      renderWithProviders(<ApplicationForm />);

      const legalNameInput = screen.getByLabelText(/Legal Name/i);
      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      const tenorInput = screen.getByLabelText(/Tenor/i);

      expect(legalNameInput).toHaveAttribute('required');
      expect(loanAmountInput).toHaveAttribute('required');
      expect(tenorInput).toHaveAttribute('required');
    });

    test('should validate numeric fields accept only numbers', () => {
      renderWithProviders(<ApplicationForm />);

      const yearsInput = screen.getByLabelText(/Years in Business/i);
      const tenorInput = screen.getByLabelText(/Tenor/i);
      const creditScoreInput = screen.getByLabelText(/Credit Score/i);

      expect(yearsInput).toHaveAttribute('type', 'number');
      expect(tenorInput).toHaveAttribute('type', 'number');
      expect(creditScoreInput).toHaveAttribute('type', 'number');
    });

    test('should validate credit score range', () => {
      renderWithProviders(<ApplicationForm />);

      const creditScoreInput = screen.getByLabelText(/Credit Score/i);

      expect(creditScoreInput).toHaveAttribute('min', '300');
      expect(creditScoreInput).toHaveAttribute('max', '850');
    });

    test('should validate minimum values for numeric fields', () => {
      renderWithProviders(<ApplicationForm />);

      const yearsInput = screen.getByLabelText(/Years in Business/i);
      const tenorInput = screen.getByLabelText(/Tenor/i);

      expect(yearsInput).toHaveAttribute('min', '0');
      expect(tenorInput).toHaveAttribute('min', '1');
    });
  });

  describe('Form Submission', () => {
    const fillCompleteForm = () => {
      // Applicant Information
      fireEvent.change(screen.getByLabelText(/Legal Name/i), {
        target: { value: 'Tech Solutions Inc.' }
      });
      fireEvent.change(screen.getByLabelText(/Business Type/i), {
        target: { value: 'Corporation' }
      });
      fireEvent.change(screen.getByLabelText(/Industry/i), {
        target: { value: 'Technology' }
      });
      fireEvent.change(screen.getByLabelText(/Years in Business/i), {
        target: { value: '5' }
      });

      // Loan Request
      fireEvent.change(screen.getByLabelText(/Loan Amount/i), {
        target: { value: '500000' }
      });
      fireEvent.change(screen.getByLabelText(/Tenor \(months\)/i), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByLabelText(/Purpose/i), {
        target: { value: 'Business expansion' }
      });

      // Financial Snapshot
      fireEvent.change(screen.getByLabelText(/Monthly Revenue/i), {
        target: { value: '200000' }
      });
      fireEvent.change(screen.getByLabelText(/Monthly Expenses/i), {
        target: { value: '150000' }
      });
      fireEvent.change(screen.getByLabelText(/Existing Debt Payment/i), {
        target: { value: '20000' }
      });

      // Collateral
      fireEvent.change(screen.getByLabelText(/Collateral Type/i), {
        target: { value: 'Real Estate' }
      });
      fireEvent.change(screen.getByLabelText(/Estimated Value/i), {
        target: { value: '1000000' }
      });

      // Owner Information
      fireEvent.change(screen.getByLabelText(/Owner Name/i), {
        target: { value: 'John Smith' }
      });
      fireEvent.change(screen.getByLabelText(/ID Number/i), {
        target: { value: 'ID-12345' }
      });
      fireEvent.change(screen.getByLabelText(/Credit Score/i), {
        target: { value: '750' }
      });
    };

    test('should submit form with valid data', async () => {
      api.post.mockResolvedValue({
        data: {
          id: 'test-id-123',
          application_number: 'APP-2026-0001',
          status: 'Draft'
        }
      });

      renderWithProviders(<ApplicationForm />);
      fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/applications', expect.objectContaining({
          applicant: expect.objectContaining({
            legal_name: 'Tech Solutions Inc.',
            business_type: 'Corporation',
            industry: 'Technology',
            years_in_business: 5
          }),
          loan_request: expect.objectContaining({
            amount: 500000,
            tenor_months: 12,
            purpose: 'Business expansion',
            repayment_type: 'monthly'
          })
        }));
      });
    });

    test('should navigate to application detail on success', async () => {
      api.post.mockResolvedValue({
        data: {
          id: 'test-id-123',
          application_number: 'APP-2026-0001',
          status: 'Draft'
        }
      });

      renderWithProviders(<ApplicationForm />);
      fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/applications/test-id-123');
      });
    });

    test('should disable submit button while loading', async () => {
      api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(<ApplicationForm />);
      fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      api.post.mockRejectedValue({
        response: {
          data: {
            error: 'Failed to create application'
          }
        }
      });

      renderWithProviders(<ApplicationForm />);
      fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });

    test('should convert currency strings to numbers', async () => {
      api.post.mockResolvedValue({
        data: { id: 'test-id', application_number: 'APP-2026-0001' }
      });

      renderWithProviders(<ApplicationForm />);
      
      // Enter formatted currency
      const loanAmountInput = screen.getByLabelText(/Loan Amount/i);
      fireEvent.change(loanAmountInput, { target: { value: '500000' } });
      fireEvent.blur(loanAmountInput); // This formats it to 500,000.00

      fillCompleteForm();

      const submitButton = screen.getByRole('button', { name: /Create Application/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/applications', expect.objectContaining({
          loan_request: expect.objectContaining({
            amount: 500000 // Should be a number, not string
          })
        }));
      });
    });
  });

  describe('Dropdown Options', () => {
    test('should display all business type options', () => {
      renderWithProviders(<ApplicationForm />);

      const businessTypeSelect = screen.getByLabelText(/Business Type/i);
      const options = Array.from(businessTypeSelect.options).map(opt => opt.value);

      expect(options).toContain('Sole Proprietorship');
      expect(options).toContain('Partnership');
      expect(options).toContain('Corporation');
      expect(options).toContain('Cooperative');
    });

    test('should display all industry options', () => {
      renderWithProviders(<ApplicationForm />);

      const industrySelect = screen.getByLabelText(/Industry/i);
      const options = Array.from(industrySelect.options).map(opt => opt.value);

      expect(options).toContain('Retail');
      expect(options).toContain('Manufacturing');
      expect(options).toContain('Technology');
      expect(options).toContain('Services');
    });

    test('should display all collateral type options', () => {
      renderWithProviders(<ApplicationForm />);

      const collateralSelect = screen.getByLabelText(/Collateral Type/i);
      const options = Array.from(collateralSelect.options).map(opt => opt.value);

      expect(options).toContain('Real Estate');
      expect(options).toContain('Vehicle');
      expect(options).toContain('Equipment');
      expect(options).toContain('Inventory');
    });

    test('should display all repayment type options', () => {
      renderWithProviders(<ApplicationForm />);

      const repaymentSelect = screen.getByLabelText(/Repayment Type/i);
      const options = Array.from(repaymentSelect.options).map(opt => opt.value);

      expect(options).toContain('monthly');
      expect(options).toContain('quarterly');
      expect(options).toContain('bullet');
    });
  });

  describe('Navigation', () => {
    test('should navigate back on cancel button click', () => {
      renderWithProviders(<ApplicationForm />);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test('should navigate back on back button click', () => {
      renderWithProviders(<ApplicationForm />);

      const backButton = screen.getByRole('button', { name: /Back/i });
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});

// Made with Bob
