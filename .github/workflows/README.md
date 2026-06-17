# GitHub Actions Workflows for OpenShift Deployment

This directory contains automated CI/CD workflows for deploying the Loan Origination System to Red Hat OpenShift.

## Workflows

### 1. Deploy to OpenShift (`openshift-deploy.yml`)

Automates the complete deployment process including building container images, deploying to OpenShift, and verifying the deployment.

#### Triggers

- **Push to main/develop branches**: Automatically deploys to production/development
- **Pull requests to main**: Runs deployment validation
- **Manual dispatch**: Deploy on-demand with environment selection

#### Features

- ✅ Automated container image builds (backend & frontend)
- ✅ Image tagging with commit SHA and environment
- ✅ ConfigMap and Secret management
- ✅ Deployment rollout with health checks
- ✅ Automatic rollback on failure
- ✅ Deployment summary in GitHub Actions UI
- ✅ Environment-specific deployments (development/staging/production)

#### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `OPENSHIFT_SERVER` | OpenShift cluster API URL | `https://api.cluster.example.com:6443` |
| `OPENSHIFT_TOKEN` | Service account token | `sha256~xxxxx...` |
| `OPENSHIFT_PROJECT` | OpenShift project/namespace | `los-demo-v1` |
| `JWT_SECRET` | JWT signing secret | `your-secure-random-string` |
| `WATSONX_API_KEY` | IBM Watsonx.ai API key | `your-watsonx-api-key` |
| `WATSONX_PROJECT_ID` | IBM Watsonx.ai project ID | `your-project-id` |
| `IBM_COS_API_KEY` | IBM Cloud Object Storage API key (optional) | `your-cos-api-key` |
| `IBM_COS_INSTANCE_ID` | IBM COS instance ID (optional) | `your-instance-id` |

#### Usage

**Automatic Deployment:**
```bash
# Push to main branch (deploys to production)
git push origin main

# Push to develop branch (deploys to development)
git push origin develop
```

**Manual Deployment:**
1. Go to Actions tab in GitHub
2. Select "Deploy to OpenShift" workflow
3. Click "Run workflow"
4. Select environment (development/staging/production)
5. Click "Run workflow"

#### Workflow Steps

1. **Checkout code** - Clone repository
2. **Install OpenShift CLI** - Install `oc` command-line tool
3. **Authenticate** - Login to OpenShift cluster
4. **Create/Update ConfigMap** - Apply configuration
5. **Create/Update Secrets** - Apply sensitive credentials
6. **Create PVC** - Ensure persistent storage exists
7. **Build Backend Image** - Build and push backend container
8. **Build Frontend Image** - Build and push frontend container
9. **Tag Images** - Tag with commit SHA and environment
10. **Deploy Backend** - Apply backend deployment
11. **Deploy Frontend** - Apply frontend deployment
12. **Create Services** - Expose applications internally
13. **Create Routes** - Expose applications externally
14. **Initialize Data** - Seed database (development only)
15. **Verify Deployment** - Health checks and status
16. **Deployment Summary** - Generate report

#### Rollback

If deployment fails, the workflow automatically triggers a rollback job that:
- Reverts backend deployment to previous version
- Reverts frontend deployment to previous version
- Verifies rollback completion
- Notifies in GitHub Actions summary

### 2. Cleanup OpenShift Resources (`openshift-cleanup.yml`)

Safely removes OpenShift resources with confirmation.

#### Triggers

- **Manual dispatch only** - Requires explicit confirmation

#### Cleanup Scopes

1. **Deployments** - Removes only deployment resources
2. **All Resources** - Removes deployments, services, routes, PVC, ConfigMap, and secrets
3. **Project** - Deletes entire OpenShift project

#### Usage

1. Go to Actions tab in GitHub
2. Select "Cleanup OpenShift Resources" workflow
3. Click "Run workflow"
4. Type `DELETE` in confirmation field
5. Select cleanup scope
6. Click "Run workflow"

⚠️ **Warning**: This action is irreversible. Always backup data before cleanup.

## Setup Instructions

### 1. Create OpenShift Service Account

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Create service account
oc create serviceaccount github-actions -n los-demo-v1

# Grant permissions
oc policy add-role-to-user admin system:serviceaccount:los-demo-v1:github-actions -n los-demo-v1

# Get token
oc create token github-actions -n los-demo-v1 --duration=8760h
```

### 2. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each required secret from the table above

### 3. Update ConfigMap (if needed)

Edit `openshift/configmap.yaml` to match your environment:

```yaml
data:
  api-url: "https://your-backend-route.apps.cluster.example.com"
  watsonx-api-url: "https://us-south.ml.cloud.ibm.com"
  # ... other configuration
```

### 4. Test Deployment

```bash
# Trigger manual deployment
# Go to Actions → Deploy to OpenShift → Run workflow
# Select "development" environment
```

## Environment Strategy

### Development
- **Branch**: `develop`
- **Auto-deploy**: Yes
- **Data seeding**: Enabled
- **Purpose**: Testing and development

### Staging
- **Branch**: Manual trigger
- **Auto-deploy**: No
- **Data seeding**: Disabled
- **Purpose**: Pre-production validation

### Production
- **Branch**: `main`
- **Auto-deploy**: Yes
- **Data seeding**: Disabled
- **Purpose**: Live production environment

## Monitoring Deployments

### View Workflow Runs

1. Go to Actions tab in GitHub
2. Select a workflow run
3. View logs and deployment summary

### Check OpenShift Status

```bash
# Login to OpenShift
oc login <your-cluster-url>

# Switch to project
oc project los-demo-v1

# View pods
oc get pods

# View deployments
oc get deployments

# View routes
oc get routes

# View logs
oc logs -f deployment/los-backend
```

### Access Application

After successful deployment, access URLs are shown in the workflow summary:
- Frontend: `https://los-frontend-los-demo-v1.apps.cluster.example.com`
- Backend: `https://los-backend-los-demo-v1.apps.cluster.example.com`

## Troubleshooting

### Build Failures

**Issue**: Image build fails
```bash
# Check build logs in GitHub Actions
# Or check OpenShift build logs:
oc logs -f bc/los-backend
```

**Solution**: Verify Dockerfile syntax and dependencies

### Authentication Failures

**Issue**: Cannot authenticate to OpenShift
```bash
# Verify token is valid
oc login --token=<token> --server=<server>
```

**Solution**: Regenerate service account token

### Deployment Timeouts

**Issue**: Deployment exceeds 5-minute timeout
```bash
# Check pod status
oc get pods
oc describe pod <pod-name>
```

**Solution**: 
- Increase resource limits
- Check image pull issues
- Verify health check endpoints

### Secret Errors

**Issue**: Missing or invalid secrets
```bash
# Verify secrets exist
oc get secret los-secrets
oc describe secret los-secrets
```

**Solution**: Update GitHub secrets and re-run workflow

## Best Practices

1. **Always test in development first** before deploying to production
2. **Review deployment summary** after each deployment
3. **Monitor application logs** after deployment
4. **Keep secrets secure** - never commit to repository
5. **Use pull requests** for code review before merging to main
6. **Tag releases** for production deployments
7. **Backup data** before running cleanup workflows
8. **Rotate credentials** regularly

## Security Considerations

- Service account tokens should be rotated every 90 days
- Use separate service accounts for different environments
- Limit service account permissions to minimum required
- Enable branch protection rules for main/develop branches
- Require pull request reviews before merging
- Use environment protection rules in GitHub

## Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [OpenShift CLI Reference](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)
- [Project OpenShift Deployment Guide](../openshift/README.md)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review OpenShift pod logs
3. Consult [OPENSHIFT_DEPLOYMENT.md](../OPENSHIFT_DEPLOYMENT.md)
4. Open an issue in the repository