# GitHub Actions Automated Deployment to OpenShift

This document provides an overview of the automated CI/CD pipeline for deploying the Loan Origination System to Red Hat OpenShift using GitHub Actions.

## 📋 Overview

The GitHub Actions workflows automate the entire deployment process, from building container images to deploying and verifying the application on OpenShift. This eliminates manual deployment steps and ensures consistent, reliable deployments.

## ✨ Key Features

- **🚀 Automated Deployments**: Push to `main` or `develop` triggers automatic deployment
- **🎯 Manual Deployments**: Deploy on-demand to any environment via GitHub UI
- **🔄 Automatic Rollback**: Failed deployments automatically roll back to previous version
- **🏷️ Image Tagging**: Images tagged with commit SHA and environment for traceability
- **🔐 Secure Secrets Management**: Credentials stored securely in GitHub Secrets
- **📊 Deployment Reports**: Detailed summaries in GitHub Actions UI
- **🌍 Multi-Environment**: Support for development, staging, and production
- **✅ Health Checks**: Automatic verification of deployment success

## 🔧 Workflows

### 1. Deploy to OpenShift (`openshift-deploy.yml`)

Main deployment workflow that handles the complete deployment lifecycle.

**Triggers:**
- Push to `main` branch → Deploys to production
- Push to `develop` branch → Deploys to development
- Pull request to `main` → Validation only
- Manual dispatch → Deploy to selected environment

**What it does:**
1. Authenticates to OpenShift cluster
2. Creates/updates ConfigMap and Secrets
3. Builds backend and frontend container images
4. Tags images with commit SHA and environment
5. Deploys applications to OpenShift
6. Creates services and routes
7. Verifies deployment health
8. Generates deployment summary
9. Automatically rolls back on failure

### 2. Cleanup OpenShift Resources (`openshift-cleanup.yml`)

Safely removes OpenShift resources with confirmation.

**Triggers:**
- Manual dispatch only (requires typing "DELETE" to confirm)

**Cleanup Scopes:**
- **Deployments**: Removes only deployment resources
- **All Resources**: Removes deployments, services, routes, PVC, ConfigMap, secrets
- **Project**: Deletes entire OpenShift project

## 🚀 Quick Start

### Step 1: Prerequisites

- Red Hat OpenShift cluster access
- GitHub repository with admin permissions
- OpenShift CLI (`oc`) installed locally

### Step 2: Create OpenShift Service Account

```bash
# Login to OpenShift
oc login https://api.your-cluster.example.com:6443

# Create project
oc new-project los-demo-v1

# Create service account
oc create serviceaccount github-actions

# Grant permissions
oc policy add-role-to-user admin system:serviceaccount:los-demo-v1:github-actions

# Generate token (valid for 1 year)
oc create token github-actions --duration=8760h
```

### Step 3: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `OPENSHIFT_SERVER` | OpenShift API URL | `oc whoami --show-server` |
| `OPENSHIFT_TOKEN` | Service account token | From Step 2 |
| `OPENSHIFT_PROJECT` | Project name | `los-demo-v1` |
| `JWT_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `WATSONX_API_KEY` | IBM Watsonx.ai API key | IBM Cloud Console |
| `WATSONX_PROJECT_ID` | Watsonx.ai project ID | Watsonx.ai project settings |
| `IBM_COS_API_KEY` | IBM COS API key (optional) | IBM Cloud Console |
| `IBM_COS_INSTANCE_ID` | IBM COS instance ID (optional) | IBM Cloud Console |

### Step 4: Deploy

**Option A: Automatic Deployment**
```bash
# Deploy to development
git push origin develop

# Deploy to production
git push origin main
```

**Option B: Manual Deployment**
1. Go to **Actions** tab in GitHub
2. Select **Deploy to OpenShift**
3. Click **Run workflow**
4. Select environment (development/staging/production)
5. Click **Run workflow**

### Step 5: Verify

Check deployment status:
- View workflow progress in GitHub Actions
- Check deployment summary at bottom of workflow run
- Access application URLs provided in summary

## 📊 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                                                              │
│  Push to main/develop  OR  Manual Trigger                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Actions Workflow                     │
│                                                              │
│  1. Checkout code                                           │
│  2. Install OpenShift CLI                                   │
│  3. Authenticate to OpenShift                               │
│  4. Apply ConfigMap & Secrets                               │
│  5. Build container images                                  │
│  6. Tag images (SHA + environment)                          │
│  7. Deploy to OpenShift                                     │
│  8. Create services & routes                                │
│  9. Verify deployment                                       │
│  10. Generate summary                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  OpenShift Cluster                           │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │   Backend    │         │   Frontend   │                 │
│  │  (Node.js)   │◄────────│   (Nginx)    │                 │
│  └──────┬───────┘         └──────────────┘                 │
│         │                                                    │
│    ┌────▼─────┐                                             │
│    │   PVC    │                                             │
│    │  (5Gi)   │                                             │
│    └──────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🌍 Environment Strategy

### Development Environment
- **Branch**: `develop`
- **Auto-deploy**: Yes
- **Data seeding**: Enabled
- **Purpose**: Testing and development
- **URL Pattern**: `*-los-demo-v1.apps.cluster.example.com`

### Staging Environment
- **Branch**: Manual trigger
- **Auto-deploy**: No
- **Data seeding**: Disabled
- **Purpose**: Pre-production validation
- **URL Pattern**: `*-los-staging.apps.cluster.example.com`

### Production Environment
- **Branch**: `main`
- **Auto-deploy**: Yes (with protection rules)
- **Data seeding**: Disabled
- **Purpose**: Live production
- **URL Pattern**: `*-los-prod.apps.cluster.example.com`

## 🔒 Security Best Practices

1. **Service Account Tokens**
   - Rotate every 90 days
   - Use separate accounts per environment
   - Limit permissions to minimum required

2. **GitHub Secrets**
   - Never commit secrets to repository
   - Use environment-specific secrets
   - Rotate credentials regularly

3. **Branch Protection**
   - Require pull request reviews for `main`
   - Require status checks to pass
   - Require branches to be up to date

4. **Environment Protection**
   - Require approvals for production deployments
   - Limit who can approve deployments
   - Add deployment delays if needed

## 📈 Monitoring Deployments

### GitHub Actions UI

1. Go to **Actions** tab
2. Select workflow run
3. View real-time logs
4. Check deployment summary

### OpenShift Console

```bash
# View pods
oc get pods

# View deployments
oc get deployments

# View logs
oc logs -f deployment/los-backend

# View routes
oc get routes
```

### Application Health

```bash
# Get backend URL
BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')

# Check health
curl https://${BACKEND_URL}/health
```

## 🔄 Rollback Strategy

### Automatic Rollback

If deployment fails, the workflow automatically:
1. Detects failure
2. Triggers rollback job
3. Reverts to previous deployment
4. Verifies rollback success
5. Notifies in GitHub Actions

### Manual Rollback

```bash
# Rollback backend
oc rollout undo deployment/los-backend

# Rollback frontend
oc rollout undo deployment/los-frontend

# Verify
oc rollout status deployment/los-backend
oc rollout status deployment/los-frontend
```

## 🐛 Troubleshooting

### Build Failures

**Symptom**: Image build fails in workflow

**Check**:
```bash
# View build logs in GitHub Actions
# Or check OpenShift:
oc get builds
oc logs -f build/<build-name>
```

**Common Causes**:
- Dockerfile syntax errors
- Missing dependencies
- Network issues

### Authentication Failures

**Symptom**: `error: You must be logged in to the server (Unauthorized)`

**Solution**:
1. Verify `OPENSHIFT_TOKEN` is correct
2. Check token hasn't expired
3. Regenerate token: `oc create token github-actions --duration=8760h`
4. Update GitHub secret

### Deployment Timeouts

**Symptom**: Deployment exceeds 5-minute timeout

**Check**:
```bash
oc get pods
oc describe pod <pod-name>
oc logs <pod-name>
```

**Common Causes**:
- Insufficient resources
- Image pull errors
- Health check failures

### Route Not Accessible

**Symptom**: Cannot access application URL

**Check**:
```bash
oc get routes
oc describe route los-frontend
```

**Common Causes**:
- Route not created
- TLS certificate issues
- Service not responding

## 📚 Documentation

- **[Setup Guide](.github/SETUP_GUIDE.md)** - Complete setup instructions
- **[Workflows README](.github/workflows/README.md)** - Detailed workflow documentation
- **[Secrets Template](.github/secrets.template.md)** - GitHub secrets configuration
- **[OpenShift Deployment](OPENSHIFT_DEPLOYMENT.md)** - Manual deployment guide

## 🎯 Next Steps

1. ✅ Set up GitHub Actions workflows
2. ✅ Configure GitHub secrets
3. ✅ Test deployment to development
4. 📝 Configure branch protection rules
5. 📝 Set up production environment
6. 📝 Configure monitoring and alerts
7. 📝 Document runbooks

## 💡 Tips

- **Test in development first** before deploying to production
- **Review deployment summaries** after each deployment
- **Monitor application logs** for errors
- **Use pull requests** for code review
- **Tag releases** for production deployments
- **Keep documentation updated** as you make changes

## 🆘 Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Review OpenShift pod logs: `oc logs -f deployment/los-backend`
3. Consult troubleshooting section above
4. Review documentation links
5. Open an issue in the repository

---

**Made with ❤️ using GitHub Actions and Red Hat OpenShift**