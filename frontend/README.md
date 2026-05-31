# Loan Origination System - Frontend

A modern React-based frontend application for managing SME loan applications with a streamlined user interface.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [User Roles & Workflows](#user-roles--workflows)
- [Components](#components)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)

## Overview

The LOS Frontend provides an intuitive interface for loan officers, credit analysts, and approvers to manage the complete loan origination workflow from application submission to final decision.

## Features

### Core Functionality

- **Dashboard**: Overview of applications and statistics
- **Application Management**: Create, edit, and track loan applications
- **Document Upload**: Multi-file upload with type categorization
- **Agent Review**: AI-powered application completeness checking
- **Credit Analysis**: View risk metrics, DSCR, and risk flags
- **Decision Workflow**: Recommendation and approval process
- **Credit Memo**: Generate comprehensive credit memos
- **Audit Trail**: Complete activity history

### User Experience

- Responsive design for desktop and tablet
- Real-time form validation
- Toast notifications for user feedback
- Error boundary for graceful error handling
- Role-based UI elements
- Intuitive navigation
- Status-based workflow progression

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: CSS (inline styles with modern design)
- **State Management**: React Context API
- **Form Handling**: Controlled components

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── package.json           # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── .env.example          # Environment variables template
├── src/
│   ├── main.jsx          # Application entry point
│   ├── App.jsx           # Main app component with routing
│   ├── index.css         # Global styles
│   ├── components/
│   │   ├── Layout.jsx           # Main layout wrapper
│   │   └── ErrorBoundary.jsx    # Error handling component
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── Dashboard.jsx        # Dashboard overview
│   │   ├── ApplicationList.jsx  # Application list view
│   │   ├── ApplicationForm.jsx  # Create/edit application
│   │   ├── ApplicationDetail.jsx # Application details
│   │   ├── DocumentUpload.jsx   # Document management
│   │   ├── AgentReview.jsx      # Agent review results
│   │   ├── CreditAnalysis.jsx   # Credit analysis view
│   │   ├── DecisionWorkflow.jsx # Decision making
│   │   ├── CreditMemo.jsx       # Credit memo view
│   │   └── AuditLog.jsx         # Audit trail
│   ├── context/
│   │   ├── AuthContext.jsx      # Authentication state
│   │   └── ToastContext.jsx     # Toast notifications
│   └── services/
│       └── api.js               # API client and endpoints
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Backend server running on `http://localhost:3001`

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
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
VITE_API_URL=http://localhost:3001/api
```

### Running the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173`

### Building for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | http://localhost:3001/api |

**Note**: Vite requires environment variables to be prefixed with `VITE_`

### API Configuration

The API client is configured in `src/services/api.js`:

- Automatic JWT token injection
- Automatic redirect on 401 (unauthorized)
- Request/response interceptors
- Organized endpoint methods

## User Roles & Workflows

### Relationship Manager (RM)

**Responsibilities**:
- Create new loan applications
- Edit draft applications
- Upload required documents
- Submit applications for review

**Workflow**:
1. Create application → Fill form → Save as draft
2. Upload documents → Verify completeness
3. Submit application → Moves to "Submitted" status

### Credit Analyst

**Responsibilities**:
- Run agent reviews
- Perform credit analysis
- Adjust analysis assumptions
- Make recommendations

**Workflow**:
1. Review submitted applications
2. Run agent review → Check completeness
3. Perform credit analysis → Review metrics
4. Submit recommendation (Approve/Reject)

### Approver

**Responsibilities**:
- Review analyst recommendations
- Make final approval decisions
- Set approval conditions
- Complete approved applications

**Workflow**:
1. Review applications with recommendations
2. Review credit analysis and memo
3. Make final decision (Approve/Reject)
4. Set conditions (if approved)
5. Complete application

### Admin

**Responsibilities**:
- All above permissions
- Manage system configuration
- View all audit logs
- Manage users

## Components

### Layout Components

#### Layout
Main application wrapper with header, navigation, and footer.

**Features**:
- Responsive header with navigation
- User info display
- Logout functionality
- Active route highlighting

#### ErrorBoundary
Catches and handles React errors gracefully.

**Features**:
- Error logging
- Fallback UI
- Refresh option
- Development error details

### Context Providers

#### AuthContext
Manages authentication state and user session.

**Methods**:
- `login(username, password)` - Authenticate user
- `logout()` - Clear session
- `hasRole(role)` - Check user role
- `hasAnyRole(...roles)` - Check multiple roles

**State**:
- `user` - Current user object
- `loading` - Loading state
- `isAuthenticated` - Authentication status

#### ToastContext
Provides toast notification system.

**Methods**:
- `success(message)` - Success notification
- `error(message)` - Error notification
- `warning(message)` - Warning notification
- `info(message)` - Info notification

**Features**:
- Auto-dismiss after 5 seconds
- Multiple toasts support
- Color-coded by type
- Close button

### Pages

#### Login
User authentication page.

**Features**:
- Username/password form
- Error display
- Auto-redirect on success

#### Dashboard
Overview of applications and statistics.

**Features**:
- Application count by status
- Total loan amount
- Quick actions
- Recent applications

#### ApplicationList
List and filter applications.

**Features**:
- Status filtering
- Search functionality
- Create new application
- View application details

#### ApplicationForm
Create or edit loan applications.

**Features**:
- Multi-section form
- Real-time validation
- Save as draft
- Submit application

#### ApplicationDetail
View application details and workflow.

**Features**:
- Application information
- Status display
- Action buttons based on role
- Navigation to related pages

#### DocumentUpload
Manage application documents.

**Features**:
- Multi-file upload
- Document type selection
- Document checklist
- View/download documents

#### AgentReview
View AI agent review results.

**Features**:
- Run agent review
- Completeness scores
- Findings and recommendations
- Document quality assessment

#### CreditAnalysis
View and manage credit analysis.

**Features**:
- Risk metrics (DSCR, risk score)
- Risk flags
- Collateral coverage
- Adjust assumptions (Analyst only)

#### DecisionWorkflow
Manage recommendation and approval.

**Features**:
- Submit recommendation (Analyst)
- Finalize decision (Approver)
- Set approval conditions
- Rejection reasons

#### CreditMemo
View generated credit memo.

**Features**:
- Comprehensive application summary
- Analysis results
- Decision information
- Print-friendly format

#### AuditLog
View system audit trail.

**Features**:
- Filter by entity type
- Filter by user
- Timestamp display
- Before/after comparison

## Development

### Code Style

- Use functional components with hooks
- Use JSDoc comments for documentation
- Follow React best practices
- Use meaningful variable names
- Keep components focused and small

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `App.jsx`
3. Add navigation link in `Layout.jsx` (if needed)
4. Add API methods in `src/services/api.js` (if needed)

### State Management

**Local State**: Use `useState` for component-specific state

**Global State**: Use Context API for:
- Authentication (AuthContext)
- Notifications (ToastContext)

**Server State**: Fetch on component mount, store in local state

### Styling

The application uses inline styles with a consistent design system:

**Colors**:
- Primary: `#667eea` (purple gradient)
- Success: `#10b981` (green)
- Error: `#ef4444` (red)
- Warning: `#f59e0b` (orange)
- Info: `#3b82f6` (blue)

**Typography**:
- Font: System font stack
- Headings: Bold, larger sizes
- Body: Regular weight, 14-16px

**Spacing**:
- Consistent padding/margin scale
- Card-based layouts
- Responsive containers

### API Integration

All API calls go through `src/services/api.js`:

```javascript
import { applicationsAPI } from '../services/api';

// Get all applications
const response = await applicationsAPI.getAll();
const applications = response.data;

// Create application
const response = await applicationsAPI.create(applicationData);
const newApp = response.data;
```

### Error Handling

**API Errors**:
```javascript
try {
  const response = await applicationsAPI.create(data);
  toast.success('Application created successfully');
} catch (error) {
  toast.error(error.response?.data?.error || 'Failed to create application');
}
```

**Component Errors**: Wrapped by ErrorBoundary

## Building for Production

### Build Process

```bash
npm run build
```

This creates an optimized production build in `dist/`:
- Minified JavaScript
- Optimized CSS
- Asset optimization
- Source maps (optional)

### Build Configuration

Edit `vite.config.js` for build customization:

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
```

### Environment-Specific Builds

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm run preview
```

## Deployment

### Static Hosting

The built application is a static site that can be hosted on:

1. **Netlify**
   - Connect GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Vercel**
   - Import project
   - Framework preset: Vite
   - Auto-deploy on push

3. **AWS S3 + CloudFront**
   - Upload `dist/` to S3 bucket
   - Configure CloudFront distribution
   - Set up custom domain

4. **Nginx**
   - Copy `dist/` to web root
   - Configure nginx for SPA routing

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/los-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables in Production

Set `VITE_API_URL` to your production API URL:

```env
VITE_API_URL=https://api.your-domain.com/api
```

**Note**: Environment variables are embedded at build time, not runtime.

## Troubleshooting

### Common Issues

**API connection errors**:
- Verify backend is running
- Check `VITE_API_URL` in `.env`
- Check CORS configuration on backend

**Authentication issues**:
- Clear localStorage
- Check JWT token expiration
- Verify credentials

**Build errors**:
- Clear `node_modules` and reinstall
- Check Node.js version (18+)
- Verify all dependencies installed

**Routing issues in production**:
- Configure server for SPA routing
- All routes should serve `index.html`

### Development Tips

**Hot Module Replacement (HMR)**:
- Vite provides fast HMR
- Changes reflect immediately
- State is preserved when possible

**Browser DevTools**:
- React DevTools extension
- Network tab for API debugging
- Console for error messages

**Debugging**:
```javascript
// Add console logs
console.log('Data:', data);

// Use debugger
debugger;

// React DevTools
// Inspect component props and state
```

## Performance Optimization

### Current Optimizations

- Vite's fast build system
- Code splitting by route
- Lazy loading of pages
- Optimized production builds

### Recommended Improvements

1. **Code Splitting**: Implement React.lazy for routes
2. **Memoization**: Use React.memo for expensive components
3. **Virtual Scrolling**: For long lists
4. **Image Optimization**: Compress and lazy-load images
5. **Caching**: Implement service worker for offline support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Note**: IE11 is not supported

## Accessibility

Current accessibility features:
- Semantic HTML
- Keyboard navigation
- Focus management
- Error messages

Recommended improvements:
- ARIA labels
- Screen reader testing
- Color contrast compliance
- Focus indicators

## Testing

### Manual Testing

Test all user workflows:
- Login/logout
- Create application
- Upload documents
- Run agent review
- Perform analysis
- Make decisions

### Automated Testing (Recommended)

Add testing with:
- **Vitest**: Unit tests
- **React Testing Library**: Component tests
- **Cypress**: E2E tests

## Contributing

1. Follow existing code style
2. Add JSDoc documentation
3. Test all changes
4. Update README if needed

## License

This is a demo application for educational purposes.

## Support

For issues or questions:
- Check API documentation
- Review code comments
- Contact development team

---

**Made with Bob** 🤖