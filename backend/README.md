# Loan Origination System - Backend

A Node.js/Express backend API for managing SME loan applications, credit analysis, and decision workflows.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Data Storage](#data-storage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## Overview

The LOS Backend provides a RESTful API for the Loan Origination System, handling:

- User authentication and authorization
- Loan application lifecycle management
- Document upload and management
- AI-powered agent reviews
- Credit risk analysis and scoring
- Decision workflow (recommendation and approval)
- Credit memo generation
- Comprehensive audit logging

## Features

### Core Functionality

- **Application Management**: CRUD operations with status workflow
- **Document Processing**: Upload, storage, and field extraction
- **Credit Analysis**: Automated DSCR, risk scoring, and flag generation
- **Agent Review**: AI-powered application completeness checking
- **Decision Workflow**: Multi-stage approval process
- **Audit Trail**: Complete activity logging
- **Role-Based Access Control**: RM, Analyst, Approver, Admin roles

### Technical Features

- JWT-based authentication
- File-based JSON storage (easily replaceable with database)
- Request validation with express-validator
- Automatic backup creation on data writes
- Comprehensive error handling
- CORS support for frontend integration

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **File Upload**: Multer
- **HTTP Client**: Axios
- **Utilities**: uuid, bcryptjs

## Project Structure

```
backend/
├── server.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── .env.example            # Environment variables template
├── data/                   # JSON data storage
│   ├── users.json
│   ├── applications.json
│   ├── documents.json
│   ├── analyses.json
│   ├── decisions.json
│   ├── agent_reviews.json
│   ├── audit_log.json
│   └── uploads/           # Uploaded document files
├── src/
│   ├── config/
│   │   └── policy.json    # Credit policy configuration
│   ├── middleware/
│   │   └── auth.js        # Authentication & authorization
│   ├── routes/
│   │   ├── auth.js        # Authentication endpoints
│   │   ├── applications.js # Application endpoints
│   │   ├── documents.js   # Document endpoints
│   │   ├── audit.js       # Audit log endpoints
│   │   └── config.js      # Configuration endpoints
│   ├── services/
│   │   ├── authService.js        # User authentication
│   │   ├── applicationService.js # Application logic
│   │   ├── documentService.js    # Document management
│   │   ├── analysisService.js    # Credit analysis
│   │   ├── agentReviewService.js # AI agent review
│   │   ├── decisionService.js    # Decision workflow
│   │   ├── memoService.js        # Credit memo generation
│   │   └── auditService.js       # Audit logging
│   └── utils/
│       ├── fileStorage.js  # JSON file storage utility
│       └── seedData.js     # Data seeding utility
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
PORT=3001
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3001`

### Initial Setup

On first run, the server will:
1. Create the `data/` directory structure
2. Initialize empty JSON files
3. Create default demo users
4. Display available endpoints and demo credentials

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `NODE_ENV` | Environment (development/production) | development |

### Credit Policy

Edit `src/config/policy.json` to configure credit thresholds and risk weights:

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

## API Documentation

See [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) for complete API reference.

### Quick Reference

**Base URL**: `http://localhost:3001/api`

**Authentication**: Include JWT token in header:
```
Authorization: Bearer {token}
```

**Key Endpoints**:
- `POST /auth/login` - User login
- `GET /applications` - List applications
- `POST /applications` - Create application
- `POST /applications/:id/documents` - Upload document
- `POST /applications/:id/agent-review` - Run agent review
- `POST /applications/:id/analysis` - Create analysis
- `POST /applications/:id/decision/recommend` - Submit recommendation
- `POST /applications/:id/decision/finalize` - Finalize decision

## Authentication & Authorization

### User Roles

| Role | Permissions |
|------|-------------|
| **RM** | Create/edit applications, upload documents |
| **Credit Analyst** | Perform analysis, make recommendations |
| **Approver** | Make final approval/rejection decisions |
| **Admin** | Full system access, manage configuration |

### Demo Users

| Username | Password | Role |
|----------|----------|------|
| rm1 | password123 | RM |
| analyst1 | password123 | Credit Analyst |
| approver1 | password123 | Approver |
| admin | admin123 | Admin |

### JWT Token

- Tokens expire after 24 hours
- Include in Authorization header: `Bearer {token}`
- Automatically validated by middleware

## Data Storage

### File-Based Storage

The system uses JSON files for data persistence:

- **Location**: `backend/data/`
- **Format**: Pretty-printed JSON (2-space indent)
- **Backup**: Automatic `.backup` files created on writes
- **Scalability**: Easily replaceable with database (MongoDB, PostgreSQL, etc.)

### Data Files

- `users.json` - User accounts
- `applications.json` - Loan applications
- `documents.json` - Document metadata
- `analyses.json` - Credit analyses
- `decisions.json` - Decision records
- `agent_reviews.json` - Agent review results
- `audit_log.json` - Audit trail
- `uploads/` - Uploaded document files

### Migrating to Database

To migrate to a database:

1. Replace `fileStorage.js` with database adapter
2. Update service methods to use database queries
3. Maintain the same interface for minimal code changes

## Development

### Code Style

- Use JSDoc comments for all functions and classes
- Follow Express.js best practices
- Use async/await for asynchronous operations
- Implement proper error handling

### Adding New Endpoints

1. Create route handler in `src/routes/`
2. Implement business logic in `src/services/`
3. Add authentication/authorization middleware
4. Add validation middleware
5. Update API documentation

### Adding New Features

1. Define service methods in appropriate service file
2. Create route handlers
3. Add tests
4. Update documentation

## Testing

### Manual Testing

Use the provided test script:
```bash
bash test_backend.sh
```

Or use the Node.js test script:
```bash
node test-api.js
```

### API Testing Tools

- **Postman**: Import endpoints from API documentation
- **cURL**: Use command-line examples
- **Thunder Client**: VS Code extension

### Test Coverage

Current test coverage includes:
- Authentication flow
- Application CRUD operations
- Document upload
- Status transitions
- Agent review
- Credit analysis
- Decision workflow

## Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up database (replace file storage)
- [ ] Configure file upload limits
- [ ] Set up logging service
- [ ] Configure backup strategy
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Set up SSL/TLS

### Environment Setup

**Production `.env`**:
```env
PORT=3001
JWT_SECRET=strong-random-secret-key
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

### Deployment Options

1. **Traditional Server**
   - Use PM2 for process management
   - Set up Nginx as reverse proxy
   - Configure SSL with Let's Encrypt

2. **Docker**
   - Create Dockerfile
   - Use docker-compose for multi-container setup
   - Configure volumes for data persistence

3. **Cloud Platforms**
   - AWS (EC2, Elastic Beanstalk, ECS)
   - Google Cloud (App Engine, Cloud Run)
   - Azure (App Service)
   - Heroku

### Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name los-backend

# Monitor
pm2 monit

# View logs
pm2 logs los-backend

# Restart
pm2 restart los-backend
```

## Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```

**Permission errors on data directory**:
```bash
chmod -R 755 data/
```

**JWT token errors**:
- Ensure `JWT_SECRET` is set in `.env`
- Check token expiration (24 hours)
- Verify token format in Authorization header

**File upload errors**:
- Check `data/uploads/` directory exists
- Verify file size limits (10MB default)
- Ensure allowed file types (PDF, JPG, PNG, DOCX)

## Performance Considerations

### Current Limitations

- File-based storage not suitable for high concurrency
- No caching implemented
- No rate limiting
- Synchronous file operations

### Optimization Recommendations

1. **Database Migration**: Replace file storage with database
2. **Caching**: Implement Redis for frequently accessed data
3. **Rate Limiting**: Add express-rate-limit middleware
4. **Async Operations**: Use worker queues for heavy operations
5. **CDN**: Serve uploaded files from CDN
6. **Load Balancing**: Use multiple instances with load balancer

## Security

### Current Security Measures

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Request validation
- CORS configuration
- File type validation on uploads

### Security Recommendations

- Implement rate limiting
- Add request size limits
- Use helmet.js for security headers
- Implement CSRF protection
- Add input sanitization
- Set up security monitoring
- Regular dependency updates
- Implement API versioning

## Contributing

1. Follow existing code style
2. Add JSDoc documentation
3. Update API documentation
4. Add tests for new features
5. Update README if needed

## License

This is a demo application for educational purposes.

## Support

For issues or questions:
- Check API documentation
- Review code comments
- Contact development team

---

**Made with Bob** 🤖