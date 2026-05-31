# Next Steps for OpenShift Deployment

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] OpenShift CLI (`oc`) installed
- [ ] Access to an OpenShift cluster
- [ ] IBM Watsonx.ai API Key
- [ ] IBM Watsonx.ai Project ID
- [ ] (Optional) IBM Cloud Object Storage credentials

## Step-by-Step Deployment Instructions

### 1. Install OpenShift CLI (if not already installed)

**macOS:**
```bash
brew install openshift-cli
```

**Linux:**
```bash
# Download from: https://mirror.openshift.com/pub/openshift-v4/clients/ocp/latest/
wget https://mirror.openshift.com/pub/openshift-v4/clients/ocp/latest/openshift-client-linux.tar.gz
tar xvf openshift-client-linux.tar.gz
sudo mv oc /usr/local/bin/
```

**Windows:**
Download from: https://mirror.openshift.com/pub/openshift-v4/clients/ocp/latest/

### 2. Login to Your OpenShift Cluster

```bash
# Get your login command from the OpenShift web console
# Click on your username (top right) → "Copy login command"
oc login --token=<your-token> --server=<your-server-url>
```

Verify login:
```bash
oc whoami
oc cluster-info
```

### 3. Get IBM Watsonx.ai Credentials

1. **API Key:**
   - Go to: https://cloud.ibm.com/iam/apikeys
   - Click "Create an IBM Cloud API key"
   - Copy and save the API key securely

2. **Project ID:**
   - Go to: https://dataplatform.cloud.ibm.com/projects
   - Select or create a project
   - Copy the Project ID from the project settings

### 4. Create Secrets File

```bash
# Navigate to your project directory
cd /Users/robi/Documents/GitHub/losbobdemo_v2

# Copy the secrets template
cp openshift/secrets.yaml.template openshift/secrets.yaml

# Generate a JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT Secret: $JWT_SECRET"
```

Edit `openshift/secrets.yaml` and replace the placeholders:

```yaml
stringData:
  jwt-secret: "paste-your-generated-jwt-secret-here"
  watsonx-api-key: "paste-your-watsonx-api-key-here"
  watsonx-project-id: "paste-your-watsonx-project-id-here"
  # Optional - only if using IBM Cloud Object Storage
  ibm-cos-api-key: "paste-your-cos-api-key-here"
  ibm-cos-instance-id: "paste-your-cos-instance-id-here"
```

**IMPORTANT:** Never commit `openshift/secrets.yaml` to git!

### 5. Run the Deployment Script

```bash
# Make sure you're in the project root directory
cd /Users/robi/Documents/GitHub/losbobdemo_v2

# Run the deployment script
./openshift/deploy.sh
```

The script will:
- Create the OpenShift project
- Apply all configurations
- Build container images
- Deploy the application
- Initialize data
- Display access URLs

**Expected Output:**
```
========================================
Loan Origination System - OpenShift Deployment
========================================

✓ OpenShift CLI found and authenticated
✓ ConfigMap applied
✓ Secrets applied
✓ PVC created
✓ Backend image built
✓ Frontend image built
✓ Backend deployment created
✓ Frontend deployment created
✓ Services created
✓ Routes created
✓ All deployments ready
✓ Data initialized

========================================
Deployment Complete!
========================================

Frontend URL: https://los-frontend-los-demo.apps.your-cluster.com
Backend URL:  https://los-backend-los-demo.apps.your-cluster.com
```

### 6. Verify Deployment

```bash
# Check all resources
oc get all

# Check pods are running
oc get pods

# Check routes
oc get routes

# View backend logs
oc logs -f deployment/los-backend

# View frontend logs
oc logs -f deployment/los-frontend
```

### 7. Access the Application

Open the Frontend URL in your browser:
```
https://los-frontend-los-demo.apps.your-cluster.com
```

Login with demo credentials:
- **RM**: rm1 / password123
- **Analyst**: analyst1 / password123
- **Approver**: approver1 / password123
- **Admin**: admin / admin123

### 8. Test the Backend API

```bash
# Get the backend URL
BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')

# Test health endpoint
curl https://${BACKEND_URL}/health

# Test login
curl -X POST https://${BACKEND_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Troubleshooting

### Issue: "oc: command not found"
**Solution:** Install OpenShift CLI (see Step 1)

### Issue: "error: You must be logged in to the server"
**Solution:** Login to OpenShift (see Step 2)

### Issue: "secrets.yaml not found"
**Solution:** Create secrets file (see Step 4)

### Issue: Build fails
```bash
# Check build logs
oc get builds
oc logs build/los-backend-1
oc logs build/los-frontend-1

# Retry build
oc start-build los-backend --follow
oc start-build los-frontend --follow
```

### Issue: Pods not starting
```bash
# Check pod status
oc get pods
oc describe pod <pod-name>
oc logs <pod-name>

# Common causes:
# - Missing or incorrect secrets
# - Image pull errors
# - Resource constraints
```

### Issue: Route not accessible
```bash
# Check route
oc get route
oc describe route los-frontend

# Check service endpoints
oc get endpoints

# Check if pods are ready
oc get pods
```

### Issue: Storage issues
```bash
# Check PVC
oc get pvc
oc describe pvc los-data-pvc

# Check available storage classes
oc get storageclass

# If needed, edit persistent-volume-claim.yaml to use available storage class
```

## Manual Deployment (Alternative)

If the automated script fails, you can deploy manually:

```bash
# 1. Create project
oc new-project los-demo

# 2. Apply ConfigMap
oc apply -f openshift/configmap.yaml

# 3. Apply Secrets
oc apply -f openshift/secrets.yaml

# 4. Create PVC
oc apply -f openshift/persistent-volume-claim.yaml

# 5. Build images
oc new-build --name=los-backend --binary --strategy=docker
oc start-build los-backend --from-dir=./backend --follow

oc new-build --name=los-frontend --binary --strategy=docker
oc start-build los-frontend --from-dir=./frontend --follow

# 6. Deploy applications
oc apply -f openshift/backend-deployment.yaml
oc apply -f openshift/frontend-deployment.yaml

# 7. Create services
oc apply -f openshift/services.yaml

# 8. Create routes
oc apply -f openshift/routes.yaml

# 9. Wait for deployments
oc rollout status deployment/los-backend
oc rollout status deployment/los-frontend

# 10. Initialize data
BACKEND_POD=$(oc get pods -l app=los-backend -o jsonpath='{.items[0].metadata.name}')
oc exec ${BACKEND_POD} -- npm run seed

# 11. Get URLs
oc get routes
```

## Monitoring Commands

```bash
# Watch pod status
watch oc get pods

# Stream logs
oc logs -f deployment/los-backend
oc logs -f deployment/los-frontend

# Check resource usage
oc adm top pods
oc adm top nodes

# View events
oc get events --sort-by='.lastTimestamp'

# Access pod shell
oc rsh <pod-name>
```

## Scaling

```bash
# Scale frontend
oc scale deployment/los-frontend --replicas=3

# Scale backend (requires shared storage or IBM COS)
oc scale deployment/los-backend --replicas=2
```

## Updating

```bash
# Update backend
oc start-build los-backend --from-dir=./backend --follow
oc rollout restart deployment/los-backend

# Update frontend
oc start-build los-frontend --from-dir=./frontend --follow
oc rollout restart deployment/los-frontend

# Update configuration
oc apply -f openshift/configmap.yaml
oc rollout restart deployment/los-backend
oc rollout restart deployment/los-frontend
```

## Cleanup

```bash
# Delete all resources
oc delete all -l app.kubernetes.io/part-of=loan-origination-system
oc delete pvc los-data-pvc
oc delete configmap los-config
oc delete secret los-secrets

# Or delete entire project
oc delete project los-demo
```

## Need Help?

1. Check [OPENSHIFT_DEPLOYMENT.md](OPENSHIFT_DEPLOYMENT.md) for detailed documentation
2. Check [openshift/README.md](openshift/README.md) for quick reference
3. Review OpenShift documentation: https://docs.openshift.com/
4. Check pod logs: `oc logs -f deployment/los-backend`
5. Check events: `oc get events`

## Security Reminders

- ✓ Never commit `openshift/secrets.yaml` to version control
- ✓ Use strong, unique JWT secrets
- ✓ Rotate credentials regularly
- ✓ Review and harden container images for production
- ✓ Enable network policies in production
- ✓ Implement proper RBAC
- ✓ Configure monitoring and alerting
- ✓ Implement backup strategy for PVC

## Success Criteria

Your deployment is successful when:
- [ ] All pods are in "Running" state
- [ ] Routes are accessible via HTTPS
- [ ] Frontend loads in browser
- [ ] Can login with demo credentials
- [ ] Backend API responds to health checks
- [ ] Can create and view loan applications

---

**Ready to deploy?** Follow the steps above in order, and you'll have your application running on OpenShift!