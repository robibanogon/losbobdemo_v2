# Deployment Troubleshooting Guide

## Deployment Failure - Commit a41feca25ca2cd635ed6b41b7e19f1eb7f0b84e2

**Status**: Deployment failed and was automatically rolled back  
**Branch**: main  
**Commit**: a41feca25ca2cd635ed6b41b7e19f1eb7f0b84e2  
**Date**: 2026-06-17

## Quick Diagnosis Steps

### 1. Check GitHub Actions Logs

```bash
# Go to GitHub repository
# Navigate to: Actions → Deploy to OpenShift → Failed workflow run
# Review logs for each step to identify failure point
```

### 2. Check OpenShift Status

```bash
# Login to OpenShift
oc login --token=<your-token> --server=<your-server>

# Switch to project
oc project los-demo-v1

# Check pod status
oc get pods

# Check recent events
oc get events --sort-by='.lastTimestamp' | tail -20

# Check deployment status
oc get deployments
oc describe deployment los-backend
oc describe deployment los-frontend
```

### 3. Check Application Logs

```bash
# Backend logs
oc logs -f deployment/los-backend --tail=100

# Frontend logs
oc logs -f deployment/los-frontend --tail=100

# Previous pod logs (if pod crashed)
oc logs <pod-name> --previous
```

## Common Failure Scenarios

### Scenario 1: Build Failures

**Symptoms**:
- Build step fails in GitHub Actions
- Error messages about Docker build

**Check**:
```bash
# View build logs
oc get builds
oc logs -f build/los-backend-<build-number>
oc logs -f build/los-frontend-<build-number>
```

**Common Causes**:
1. **Dockerfile syntax errors**
   - Solution: Review Dockerfile changes in commit a41feca
   - Verify all COPY commands reference existing files
   - Check for typos in RUN commands

2. **Missing dependencies**
   - Solution: Verify package.json includes all dependencies
   - Check npm install completes successfully locally

3. **Build context issues**
   - Solution: Ensure .dockerignore doesn't exclude required files
   - Verify all source files are committed

**Fix**:
```bash
# Test build locally
cd backend
docker build -t test-backend .

cd ../frontend
docker build -t test-frontend .
```

### Scenario 2: Image Pull Failures

**Symptoms**:
- Pods stuck in `ImagePullBackOff` or `ErrImagePull`
- Cannot pull image from registry

**Check**:
```bash
oc describe pod <pod-name>
# Look for "Failed to pull image" errors
```

**Common Causes**:
1. **Image doesn't exist**
   - Solution: Verify build completed successfully
   - Check image exists: `oc get imagestream`

2. **Registry authentication issues**
   - Solution: Verify service account has image pull permissions
   - Check: `oc policy add-role-to-user system:image-puller system:serviceaccount:los-demo-v1:default`

**Fix**:
```bash
# Verify image exists
oc get imagestream los-backend
oc get imagestream los-frontend

# Check image tags
oc describe imagestream los-backend
```

### Scenario 3: Deployment Timeout

**Symptoms**:
- Deployment exceeds 5-minute timeout
- Pods not reaching Ready state

**Check**:
```bash
oc get pods
oc describe pod <pod-name>
```

**Common Causes**:
1. **Health check failures**
   - Solution: Verify `/health` endpoint works
   - Check readiness/liveness probe configuration

2. **Application startup errors**
   - Solution: Check application logs for errors
   - Verify environment variables are set correctly

3. **Resource constraints**
   - Solution: Check if cluster has sufficient resources
   - Review resource limits in deployment YAML

**Fix**:
```bash
# Check pod logs for startup errors
oc logs <pod-name>

# Check resource usage
oc describe node

# Temporarily increase timeout (in workflow)
# Change: --timeout=5m to --timeout=10m
```

### Scenario 4: Missing Secrets/ConfigMap

**Symptoms**:
- Pods crash with environment variable errors
- "Secret not found" or "ConfigMap not found" errors

**Check**:
```bash
oc get secrets
oc get configmaps
oc describe secret los-secrets
oc describe configmap los-config
```

**Common Causes**:
1. **Secrets not created**
   - Solution: Verify GitHub secrets are configured
   - Check workflow logs for secret creation step

2. **Secret key mismatch**
   - Solution: Verify secret keys match deployment YAML
   - Check for typos in secret names

**Fix**:
```bash
# Manually create secrets if needed
oc create secret generic los-secrets \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=watsonx-api-key="your-api-key" \
  --from-literal=watsonx-project-id="your-project-id"

# Verify secrets
oc get secret los-secrets -o yaml
```

### Scenario 5: Route/Service Issues

**Symptoms**:
- Deployment succeeds but application not accessible
- 503 Service Unavailable errors

**Check**:
```bash
oc get routes
oc get services
oc describe route los-frontend
oc describe service los-backend
```

**Common Causes**:
1. **Service selector mismatch**
   - Solution: Verify service selector matches pod labels
   - Check: `oc get pods --show-labels`

2. **Route not created**
   - Solution: Apply routes.yaml manually
   - Check: `oc apply -f openshift/routes.yaml`

**Fix**:
```bash
# Recreate routes
oc delete route los-frontend los-backend
oc apply -f openshift/routes.yaml

# Test service connectivity
oc port-forward deployment/los-backend 3001:3001
curl http://localhost:3001/health
```

### Scenario 6: PVC Issues

**Symptoms**:
- Pods stuck in `Pending` state
- "FailedMount" or "FailedAttachVolume" errors

**Check**:
```bash
oc get pvc
oc describe pvc los-data-pvc
```

**Common Causes**:
1. **PVC not bound**
   - Solution: Check if storage class is available
   - Verify cluster has available storage

2. **PVC already bound to another pod**
   - Solution: Scale down deployments before redeploying
   - Check: `oc get pods -o wide`

**Fix**:
```bash
# Check PVC status
oc get pvc los-data-pvc

# If needed, delete and recreate
oc delete pvc los-data-pvc
oc apply -f openshift/persistent-volume-claim.yaml
```

## Specific Checks for Commit a41feca

### Check Recent Changes

```bash
# View commit changes
git show a41feca25ca2cd635ed6b41b7e19f1eb7f0b84e2

# Check if any deployment files were modified
git diff a41feca^..a41feca openshift/
git diff a41feca^..a41feca backend/Dockerfile
git diff a41feca^..a41feca frontend/Dockerfile
```

### Verify Workflow Configuration

```bash
# Check if workflow file was modified
git diff a41feca^..a41feca .github/workflows/openshift-deploy.yml
```

## Recovery Steps

### Option 1: Fix and Redeploy

1. Identify root cause from logs
2. Fix the issue in code
3. Commit and push fix
4. Workflow will automatically redeploy

```bash
# Make fixes
git add .
git commit -m "Fix deployment issue"
git push origin main
```

### Option 2: Manual Rollback Verification

```bash
# Verify rollback was successful
oc get pods
oc get deployments

# Check application is working
FRONTEND_URL=$(oc get route los-frontend -o jsonpath='{.spec.host}')
curl -I https://${FRONTEND_URL}

BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')
curl https://${BACKEND_URL}/health
```

### Option 3: Manual Deployment

If automated deployment continues to fail:

```bash
# Use manual deployment script
cd openshift
./deploy.sh
```

## Prevention Strategies

### 1. Test Locally Before Pushing

```bash
# Test backend build
cd backend
docker build -t test-backend .
docker run -p 3001:3001 test-backend

# Test frontend build
cd frontend
docker build -t test-frontend .
docker run -p 8080:8080 test-frontend
```

### 2. Use Pull Requests

- Create feature branch
- Test changes
- Create PR to main
- Review and approve
- Merge triggers deployment

### 3. Enable Branch Protection

```bash
# In GitHub:
# Settings → Branches → Add rule
# - Require pull request reviews
# - Require status checks to pass
# - Require branches to be up to date
```

### 4. Add Pre-deployment Validation

Consider adding validation step to workflow:
- Lint Dockerfiles
- Run unit tests
- Validate YAML files
- Check for common issues

## Next Steps

1. **Immediate**: Check GitHub Actions logs for specific error
2. **Short-term**: Identify and fix root cause
3. **Long-term**: Implement prevention strategies

## Getting Help

If you need assistance:

1. **Collect Information**:
   ```bash
   # Save logs
   oc logs deployment/los-backend > backend-logs.txt
   oc logs deployment/los-frontend > frontend-logs.txt
   oc get events > events.txt
   oc get all > resources.txt
   ```

2. **Check Documentation**:
   - [GitHub Actions Setup Guide](.github/SETUP_GUIDE.md)
   - [Workflows README](.github/workflows/README.md)
   - [OpenShift Deployment Guide](OPENSHIFT_DEPLOYMENT.md)

3. **Review Common Issues**:
   - Check this troubleshooting guide
   - Review OpenShift documentation
   - Search GitHub Actions logs

## Useful Commands Reference

```bash
# View all resources
oc get all

# Describe resources
oc describe deployment/los-backend
oc describe pod <pod-name>

# View logs
oc logs -f deployment/los-backend
oc logs <pod-name> --previous

# Check events
oc get events --sort-by='.lastTimestamp'

# Debug pod
oc debug deployment/los-backend

# Port forward for testing
oc port-forward deployment/los-backend 3001:3001

# Scale deployments
oc scale deployment/los-backend --replicas=0
oc scale deployment/los-backend --replicas=1

# Restart deployments
oc rollout restart deployment/los-backend
oc rollout restart deployment/los-frontend

# Check rollout status
oc rollout status deployment/los-backend
oc rollout history deployment/los-backend

# Manual rollback
oc rollout undo deployment/los-backend
```

---

**Remember**: The automatic rollback has restored the previous working version. Take time to properly diagnose and fix the issue before attempting another deployment.