# API Documentation

## Overview

The Loan Origination System (LOS) Backend API provides RESTful endpoints for managing loan applications, documents, credit analysis, and decision workflows.

**Base URL:** `http://localhost:3001/api`

**Authentication:** Bearer token (JWT) required for all endpoints except login

---

## Table of Contents

1. [Authentication](#authentication)
2. [Applications](#applications)
3. [Documents](#documents)
4. [Agent Review](#agent-review)
5. [Credit Analysis](#credit-analysis)
6. [Decision Workflow](#decision-workflow)
7. [Credit Memo](#credit-memo)
8. [Audit Log](#audit-log)
9. [Configuration](#configuration)
10. [Error Responses](#error-responses)

---

## Authentication

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "rm1",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "username": "rm1",
    "name": "John Doe",
    "role": "RM",
    "email": "rm1@example.com"
  },
  "token": "jwt-token-string"
}
```

### Get Current User

**GET** `/auth/me`

Get currently authenticated user information.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "user-uuid",
  "username": "rm1",
  "name": "John Doe",
  "role": "RM",
  "email": "rm1@example.com"
}
```

### Get All Users

**GET** `/auth/users`

Get list of all users (Admin only).

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "user-uuid",
    "username": "rm1",
    "name": "John Doe",
    "role": "RM",
    "email": "rm1@example.com"
  }
]
```

---

## Applications

### Get All Applications

**GET** `/applications`

Get all applications with optional filtering.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `status` (optional): Filter by status (Draft, Submitted, In Review, Approved, Rejected, Completed)
- `owner_user_id` (optional): Filter by owner user ID
- `search` (optional): Search by legal name or application number

**Response:**
```json
[
  {
    "id": "app-uuid",
    "application_number": "APP-2026-0001",
    "status": "Draft",
    "owner_user_id": "user-uuid",
    "applicant": {
      "legal_name": "ABC Corporation",
      "business_type": "Corporation",
      "industry": "Manufacturing",
      "years_in_business": 5
    },
    "loan_request": {
      "amount": 1000000,
      "tenor_months": 12,
      "purpose": "Working Capital",
      "repayment_type": "Monthly"
    },
    "financial_snapshot": {
      "monthly_revenue": 500000,
      "monthly_expenses": 300000,
      "existing_debt_payment": 50000
    },
    "collateral": {
      "type": "Real Estate",
      "estimated_value": 2000000
    },
    "owner_info": {
      "name": "John Smith",
      "id_number": "123456789",
      "credit_score": 720
    },
    "created_at": "2026-05-31T08:00:00.000Z",
    "updated_at": "2026-05-31T08:00:00.000Z",
    "submitted_at": null,
    "completed_at": null
  }
]
```

### Get Application by ID

**GET** `/applications/:id`

Get a single application by ID.

**Headers:** `Authorization: Bearer {token}`

**Response:** Same as single application object above

### Create Application

**POST** `/applications`

Create a new loan application.

**Headers:** `Authorization: Bearer {token}`

**Access:** RM, Admin only

**Request Body:**
```json
{
  "applicant": {
    "legal_name": "ABC Corporation",
    "business_type": "Corporation",
    "industry": "Manufacturing",
    "years_in_business": 5
  },
  "loan_request": {
    "amount": 1000000,
    "tenor_months": 12,
    "purpose": "Working Capital",
    "repayment_type": "Monthly"
  },
  "financial_snapshot": {
    "monthly_revenue": 500000,
    "monthly_expenses": 300000,
    "existing_debt_payment": 50000
  },
  "collateral": {
    "type": "Real Estate",
    "estimated_value": 2000000
  },
  "owner_info": {
    "name": "John Smith",
    "id_number": "123456789",
    "credit_score": 720
  }
}
```

**Response:** Created application object

### Update Application

**PUT** `/applications/:id`

Update an application (Draft status only).

**Headers:** `Authorization: Bearer {token}`

**Request Body:** Partial application object with fields to update

**Response:** Updated application object

### Delete Application

**DELETE** `/applications/:id`

Delete an application (Draft status only).

**Headers:** `Authorization: Bearer {token}`

**Access:** RM, Admin only

**Response:**
```json
{
  "message": "Application deleted successfully"
}
```

### Submit Application

**POST** `/applications/:id/submit`

Submit an application (Draft → Submitted).

**Headers:** `Authorization: Bearer {token}`

**Access:** RM, Admin only

**Response:** Updated application object

### Update Application Status

**POST** `/applications/:id/status`

Update application status.

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "status": "In Review"
}
```

**Response:** Updated application object

### Complete Application

**POST** `/applications/:id/complete`

Complete an application (Approved → Completed).

**Headers:** `Authorization: Bearer {token}`

**Access:** Approver, Admin only

**Response:** Updated application object

### Get Application Statistics

**GET** `/applications/statistics`

Get application statistics.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "total": 10,
  "by_status": {
    "Draft": 2,
    "Submitted": 1,
    "In Review": 3,
    "Approved": 2,
    "Rejected": 1,
    "Completed": 1
  },
  "total_amount": 10000000,
  "avg_amount": 1000000
}
```

---

## Documents

### Get Documents for Application

**GET** `/applications/:id/documents`

Get all documents for an application.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": "doc-uuid",
    "application_id": "app-uuid",
    "doc_type": "Financial Statements",
    "filename": "uuid-filename.pdf",
    "original_filename": "financials.pdf",
    "storage_path": "/path/to/file",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "extracted_fields": {
      "revenue": 500000,
      "expenses": 300000
    },
    "uploaded_by": "user-uuid",
    "uploaded_at": "2026-05-31T08:00:00.000Z"
  }
]
```

### Get Document Checklist

**GET** `/applications/:id/documents/checklist`

Get document checklist with completion status.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "required": [
    {
      "type": "Financial Statements",
      "uploaded": true,
      "document_id": "doc-uuid"
    },
    {
      "type": "Business Registration",
      "uploaded": false,
      "document_id": null
    }
  ],
  "completion_percentage": 50
}
```

### Upload Document

**POST** `/applications/:id/documents`

Upload a document for an application.

**Headers:** 
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: Document file (PDF, JPG, PNG, DOCX)
- `doc_type`: Document type (string)

**Response:** Created document object

### Get Document by ID

**GET** `/documents/:id`

Get document metadata by ID.

**Headers:** `Authorization: Bearer {token}`

**Response:** Document object

### Download Document

**GET** `/documents/:id/download`

Download document file.

**Headers:** `Authorization: Bearer {token}`

**Response:** File blob

### Delete Document

**DELETE** `/documents/:id`

Delete a document.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

---

## Agent Review

### Run Agent Review

**POST** `/applications/:id/agent-review`

Run AI agent review on an application.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "review-uuid",
  "application_id": "app-uuid",
  "completeness_score": 85,
  "document_quality_score": 90,
  "data_consistency_score": 95,
  "overall_score": 90,
  "findings": [
    {
      "category": "Documents",
      "severity": "Medium",
      "message": "Missing tax returns for last 2 years"
    }
  ],
  "recommendations": [
    "Request additional financial documentation",
    "Verify business registration details"
  ],
  "created_at": "2026-05-31T08:00:00.000Z"
}
```

### Get Agent Review

**GET** `/applications/:id/agent-review`

Get agent review for an application.

**Headers:** `Authorization: Bearer {token}`

**Response:** Agent review object

---

## Credit Analysis

### Get Analysis

**GET** `/applications/:id/analysis`

Get credit analysis for an application.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "analysis-uuid",
  "application_id": "app-uuid",
  "dscr": 1.5,
  "net_cashflow": 150000,
  "collateral_coverage": 200,
  "risk_score": 75,
  "flags": [
    {
      "type": "LOW_CREDIT_SCORE",
      "severity": "High",
      "message": "Credit score of 650 is below minimum of 680"
    }
  ],
  "assumptions": {
    "interest_rate": 0,
    "default_rate": 2,
    "recovery_rate": 70
  },
  "notes": "",
  "created_by": "user-uuid",
  "created_at": "2026-05-31T08:00:00.000Z",
  "updated_at": "2026-05-31T08:00:00.000Z"
}
```

### Create/Recalculate Analysis

**POST** `/applications/:id/analysis`

Create or recalculate credit analysis.

**Headers:** `Authorization: Bearer {token}`

**Response:** Analysis object

### Update Analysis Assumptions

**PUT** `/applications/:id/analysis/assumptions`

Update analysis assumptions and notes.

**Headers:** `Authorization: Bearer {token}`

**Access:** Credit Analyst, Admin only

**Request Body:**
```json
{
  "assumptions": {
    "interest_rate": 5.5,
    "default_rate": 2.5,
    "recovery_rate": 75
  },
  "notes": "Adjusted assumptions based on industry benchmarks"
}
```

**Response:** Updated analysis object

---

## Decision Workflow

### Get Decision

**GET** `/applications/:id/decision`

Get decision for an application.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "id": "decision-uuid",
  "application_id": "app-uuid",
  "recommended_decision": "Approve",
  "recommendation_notes": "Strong financials and collateral coverage",
  "recommended_by": "user-uuid",
  "recommended_at": "2026-05-31T08:00:00.000Z",
  "final_decision": "Approved",
  "conditions": [
    "Maintain DSCR above 1.25",
    "Quarterly financial reporting required"
  ],
  "rejection_reason": null,
  "decided_by": "user-uuid",
  "decided_at": "2026-05-31T09:00:00.000Z"
}
```

### Submit Recommendation

**POST** `/applications/:id/decision/recommend`

Submit credit analyst recommendation.

**Headers:** `Authorization: Bearer {token}`

**Access:** Credit Analyst, Admin only

**Request Body:**
```json
{
  "recommended_decision": "Approve",
  "recommendation_notes": "Strong financials and collateral coverage"
}
```

**Response:** Decision object

### Finalize Decision

**POST** `/applications/:id/decision/finalize`

Finalize decision (approve or reject).

**Headers:** `Authorization: Bearer {token}`

**Access:** Approver, Admin only

**Request Body:**
```json
{
  "final_decision": "Approved",
  "conditions": [
    "Maintain DSCR above 1.25",
    "Quarterly financial reporting required"
  ],
  "rejection_reason": null
}
```

**Response:** Decision object

---

## Credit Memo

### Generate Credit Memo

**GET** `/applications/:id/memo`

Generate credit memo for an application.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "application": { /* application object */ },
  "analysis": { /* analysis object */ },
  "decision": { /* decision object */ },
  "documents": [ /* array of documents */ ],
  "generated_at": "2026-05-31T08:00:00.000Z",
  "generated_by": "user-uuid"
}
```

---

## Audit Log

### Get All Audit Logs

**GET** `/audit`

Get all audit logs with optional filtering.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `entity_type` (optional): Filter by entity type
- `entity_id` (optional): Filter by entity ID
- `actor_id` (optional): Filter by actor ID
- `action` (optional): Filter by action

**Response:**
```json
[
  {
    "id": "log-uuid",
    "timestamp": "2026-05-31T08:00:00.000Z",
    "actor_id": "user-uuid",
    "actor_name": "John Doe",
    "action": "CREATE_APPLICATION",
    "entity_type": "Application",
    "entity_id": "app-uuid",
    "before": null,
    "after": { /* entity state after action */ }
  }
]
```

### Get Audit Logs for Application

**GET** `/applications/:id/audit`

Get audit logs for a specific application.

**Headers:** `Authorization: Bearer {token}`

**Response:** Array of audit log entries

---

## Configuration

### Get Policy

**GET** `/config/policy`

Get credit policy configuration.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "thresholds": {
    "minDSCR": 1.25,
    "minCreditScore": 680,
    "minYearsInBusiness": 2,
    "minCollateralCoverage": 120,
    "maxLoanAmount": 10000000
  },
  "riskWeights": {
    "dscr": 0.35,
    "creditScore": 0.25,
    "yearsInBusiness": 0.15,
    "collateralCoverage": 0.25
  }
}
```

### Update Policy

**PUT** `/config/policy`

Update credit policy configuration.

**Headers:** `Authorization: Bearer {token}`

**Access:** Admin only

**Request Body:** Policy object

**Response:** Updated policy object

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data or validation error
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Validation Errors

Validation errors include an `errors` array:

```json
{
  "errors": [
    {
      "msg": "Legal name is required",
      "param": "applicant.legal_name",
      "location": "body"
    }
  ]
}
```

---

## User Roles

The system supports the following user roles:

- **RM (Relationship Manager)**: Create and manage applications
- **Credit Analyst**: Perform credit analysis and make recommendations
- **Approver**: Make final approval/rejection decisions
- **Admin**: Full system access including configuration

---

## Demo Users

For testing purposes, the following demo users are available:

| Username | Password | Role |
|----------|----------|------|
| rm1 | password123 | RM |
| analyst1 | password123 | Credit Analyst |
| approver1 | password123 | Approver |
| admin | admin123 | Admin |

---

## Rate Limiting

Currently, no rate limiting is implemented. This should be added for production use.

---

## Versioning

API Version: 1.0.0

The API does not currently use versioning in the URL. Future versions may use `/api/v2/` format.

---

## Support

For issues or questions, please refer to the project documentation or contact the development team.