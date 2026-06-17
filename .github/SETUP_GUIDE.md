# GitHub Actions Setup Guide for OpenShift Deployment

This guide walks you through setting up automated deployments to OpenShift using GitHub Actions.

## Prerequisites

- Access to a Red Hat OpenShift cluster
- GitHub repository with admin access
- OpenShift CLI (`oc`) installed locally

## Step 1: Create OpenShift Service Account

The GitHub Actions workflow needs a service account to authenticate with OpenShift.

```bash
# 1. Login to your OpenShift cluster
oc login https://api.your-cluster.example.com:6443

# 2. Create or switch to your project
oc new-project los-demo-v1
# OR
oc project los-demo-v1

# 3. Create service account for GitHub Actions
oc create serviceaccount github-actions

# 4. Grant admin permissions to the service account
oc policy add-role-to-user admin system:serviceaccount:los-demo-v1:github-actions

# 5. Generate a long-lived token (1 year)
oc create token github-actions --duration=8760h

# Copy the token output - you'll need it for GitHub secrets
```

## Step 2: Get OpenShift Cluster Information

```bash
# Get your OpenShift server URL
oc whoami --show-server

# Example output: https://api.cluster-abc123.example.com:6443
```

## Step 3: Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Secrets

| Secret Name | How to Get Value | Example |
|-------------|------------------|---------|
| `OPENSHIFT_SERVER` | Output from `oc whoami --show-server` | `https://api.cluster.example.com:6443` |
| `OPENSHIFT_TOKEN` | Token from Step 1 | `sha256~xxxxxxxxxxxxxxxx` |
| `OPENSHIFT_PROJECT` | Your project name | `los-demo-v1` |
| `JWT_SECRET` | Generate random string | `openssl rand -base64 32` |
| `WATSONX_API_KEY` | From IBM Cloud Console | Get from [IBM Cloud](https://cloud.ibm.com/iam/apikeys) |
| `WATSONX_PROJECT_ID` | From Watsonx.ai project | Get from Watsonx.ai project settings |

### Optional Secrets (for IBM Cloud Object Storage)

| Secret Name | How to Get Value |
|-------------|------------------|
| `IBM_COS_API_KEY` | IBM Cloud API key with COS access |
| `IBM_COS_INSTANCE_ID` | COS instance CRN |

### Generating Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate another random secret
openssl rand -hex 32
```

## Step 4: Update ConfigMap

Edit `openshift/configmap.yaml` to match your environment:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: los-config
data:
  # Update this with your actual backend route
  api-url: "https://los-backend-los-demo-v1.apps.your-cluster.example.com"
  
  # IBM Watsonx.ai configuration
  watsonx-api-url: "https://us-south.ml.cloud.ibm.com"
  watsonx-default-model: "ibm/granite-13b-chat-v2"
  
  # Optional: IBM Cloud Object Storage
  ibm-cos-endpoint: "s3.us-south.cloud-object-storage.appdomain.cloud"
  ibm-cos-bucket-name: "los-documents"
```

## Step 5: Test the Workflow

### Option A: Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **Deploy to OpenShift** workflow
3. Click **Run workflow**
4. Select **development** environment
5. Click **Run workflow**

### Option B: Automatic Deployment

```bash
# Push to develop branch (deploys to development)
git checkout develop
git add .
git commit -m "Setup GitHub Actions"
git push origin develop

# OR push to main branch (deploys to production)
git checkout main
git add .
git commit -m "Setup GitHub Actions"
git push origin main
```

## Step 6: Verify Deployment

### Check GitHub Actions

1. Go to **Actions** tab
2. Click on the running workflow
3. Monitor the deployment progress
4. Check the deployment summary at the bottom

### Check OpenShift

```bash
# View deployment status
oc get pods
oc get deployments
oc get routes

# View logs
oc logs -f deployment/los-backend
oc logs -f deployment/los-frontend

# Get application URLs
oc get route los-frontend -o jsonpath='{.spec.host}'
oc get route los-backend -o jsonpath='{.spec.host}'
```

### Access the Application

After successful deployment, access your application:
- Frontend: `https://los-frontend-los-demo-v1.apps.your-cluster.example.com`
- Backend API: `https://los-backend-los-demo-v1.apps.your-cluster.example.com`

## Step 7: Configure Branch Protection (Recommended)

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Click **Create**

## Troubleshooting

### Issue: Authentication Failed

**Error**: `error: You must be logged in to the server (Unauthorized)`

**Solution**:
1. Verify `OPENSHIFT_TOKEN` is correct
2. Check token hasn't expired
3. Regenerate token: `oc create token github-actions --duration=8760h`
4. Update GitHub secret

### Issue: Project Not Found

**Error**: `Error from server (NotFound): project "los-demo-v1" not found`

**Solution**:
1. Create project: `oc new-project los-demo-v1`
2. Or update `OPENSHIFT_PROJECT` secret with correct project name

### Issue: Build Failed

**Error**: Build fails during image creation

**Solution**:
1. Check Dockerfile syntax
2. Verify all dependencies are available
3. Check build logs in GitHub Actions
4. Test build locally: `docker build -t test ./backend`

### Issue: Deployment Timeout

**Error**: `error: timed out waiting for the condition`

**Solution**:
1. Check pod status: `oc get pods`
2. View pod logs: `oc logs <pod-name>`
3. Check resource limits in deployment YAML
4. Verify health check endpoints are working

### Issue: Missing Secrets

**Error**: `Error: secret "los-secrets" not found`

**Solution**:
1. Verify all required GitHub secrets are configured
2. Check secret names match exactly (case-sensitive)
3. Re-run the workflow

## Environment-Specific Configuration

### Development Environment
- Branch: `develop`
- Auto-deploy: Yes
- Data seeding: Enabled
- Purpose: Testing and development

### Production Environment
- Branch: `main`
- Auto-deploy: Yes (with protection rules)
- Data seeding: Disabled
- Purpose: Live production

## Security Best Practices

1. **Rotate tokens regularly** (every 90 days)
   ```bash
   oc create token github-actions --duration=8760h
   ```

2. **Use separate service accounts** for different environments
   ```bash
   oc create serviceaccount github-actions-prod
   oc create serviceaccount github-actions-dev
   ```

3. **Limit permissions** to minimum required
   ```bash
   # Instead of admin, use specific roles
   oc policy add-role-to-user edit system:serviceaccount:los-demo-v1:github-actions
   ```

4. **Enable branch protection** on main/develop branches

5. **Use environment secrets** for production
   - Go to Settings → Environments
   - Create "production" environment
   - Add environment-specific secrets
   - Require approvals for production deployments

## Next Steps

1. ✅ Set up automated deployments
2. ✅ Configure branch protection
3. ✅ Test deployment workflow
4. 📝 Set up monitoring and alerts
5. 📝 Configure backup strategy
6. 📝 Document runbooks for common operations

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [OpenShift CLI Reference](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)
- [Workflow README](.github/workflows/README.md)
- [OpenShift Deployment Guide](../openshift/README.md)

## Support

If you encounter issues:
1. Check workflow logs in GitHub Actions
2. Review OpenShift pod logs: `oc logs -f deployment/los-backend`
3. Consult the troubleshooting section above
4. Open an issue in the repository

---

**Setup Complete!** 🎉

Your GitHub Actions workflow is now configured for automated OpenShift deployments.