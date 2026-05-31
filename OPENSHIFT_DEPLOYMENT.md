# OpenShift Deployment Guide

This guide provides step-by-step instructions for deploying the Loan Origination System (LOS) to Red Hat OpenShift.

## Prerequisites

### Required Tools
- **OpenShift CLI (oc)**: [Download and install](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)
- **Git**: For cloning the repository
- **Access to OpenShift Cluster**: With appropriate permissions to create projects and resources

### Required Credentials
Before deployment, you'll need:
1. **IBM Watsonx.ai API Key and Project ID** (Required)
   - Get API key from: https://cloud.ibm.com/iam/apikeys
   - Get Project ID from: https://dataplatform.cloud.ibm.com/projects

2. **IBM Cloud Object Storage Credentials** (Optional - for document storage)
   - Get from: https://cloud.ibm.com/objectstorage
   - Create a service credential with HMAC enabled

3. **JWT Secret**: Generate a strong random string
   ```bash
   openssl rand -base64 32
   ```

## Architecture Overview

The deployment consists of:
- **Backend Service**: Node.js Express API (1 replica)
- **Frontend Service**: React SPA with Nginx (2 replicas)
- **Persistent Storage**: 5Gi PVC for application data
- **Routes**: HTTPS routes with edge termination
- **ConfigMaps**: Non-sensitive configuration
- **Secrets**: Sensitive credentials

## Quick Deployment

### 1. Login to OpenShift

```bash
oc login <your-openshift-cluster-url>
```

### 2. Clone the Repository

```bash
git clone <repository-url>
cd losbobdemo_v2
```

### 3. Configure Secrets

Create your secrets file from the template:

```bash
cp openshift/secrets.yaml.template openshift/secrets.yaml
```

Edit `openshift/secrets.yaml` and replace the placeholder values:

```yaml
stringData:
  jwt-secret: "your-generated-jwt-secret"
  watsonx-api-key: "your-watsonx-api-key"
  watsonx-project-id: "your-watsonx-project-id"
  ibm-cos-api-key: "your-ibm-cos-api-key"  # Optional
  ibm-cos-instance-id: "your-ibm-cos-instance-id"  # Optional
```

**IMPORTANT**: Never commit `secrets.yaml` to version control!

### 4. Run Deployment Script

```bash
./openshift/deploy.sh
```

The script will:
1. Create/switch to the OpenShift project
2. Apply ConfigMaps and Secrets
3. Create Persistent Volume Claim
4. Build backend and frontend container images
5. Deploy backend and frontend applications
6. Create services and routes
7. Initialize application data
8. Display access URLs

### 5. Access the Application

After successful deployment, the script will display:
- Frontend URL: `https://los-frontend-<project>.apps.<cluster-domain>`
- Backend URL: `https://los-backend-<project>.apps.<cluster-domain>`

## Manual Deployment Steps

If you prefer to deploy manually or need more control:

### 1. Create Project

```bash
oc new-project los-demo
```

### 2. Apply ConfigMap

```bash
oc apply -f openshift/configmap.yaml
```

### 3. Create Secrets

Option A: Using the secrets file
```bash
oc apply -f openshift/secrets.yaml
```

Option B: Using oc command
```bash
oc create secret generic los-secrets \
  --from-literal=jwt-secret='your-jwt-secret' \
  --from-literal=watsonx-api-key='your-watsonx-api-key' \
  --from-literal=watsonx-project-id='your-watsonx-project-id' \
  --from-literal=ibm-cos-api-key='your-ibm-cos-api-key' \
  --from-literal=ibm-cos-instance-id='your-ibm-cos-instance-id'
```

### 4. Create Persistent Volume Claim

```bash
oc apply -f openshift/persistent-volume-claim.yaml
```

Check available storage classes:
```bash
oc get storageclass
```

If needed, edit `persistent-volume-claim.yaml` to use an available storage class.

### 5. Build Container Images

Backend:
```bash
oc new-build --name=los-backend --binary --strategy=docker
oc start-build los-backend --from-dir=./backend --follow
```

Frontend:
```bash
oc new-build --name=los-frontend --binary --strategy=docker
oc start-build los-frontend --from-dir=./frontend --follow
```

### 6. Deploy Applications

```bash
oc apply -f openshift/backend-deployment.yaml
oc apply -f openshift/frontend-deployment.yaml
```

### 7. Create Services

```bash
oc apply -f openshift/services.yaml
```

### 8. Create Routes

```bash
oc apply -f openshift/routes.yaml
```

### 9. Wait for Deployments

```bash
oc rollout status deployment/los-backend
oc rollout status deployment/los-frontend
```

### 10. Initialize Data

```bash
BACKEND_POD=$(oc get pods -l app=los-backend -o jsonpath='{.items[0].metadata.name}')
oc exec ${BACKEND_POD} -- npm run seed
```

### 11. Get Access URLs

```bash
oc get routes
```

## Configuration

### Environment Variables

Backend environment variables are configured in:
- [`openshift/configmap.yaml`](openshift/configmap.yaml) - Non-sensitive config
- [`openshift/secrets.yaml`](openshift/secrets.yaml) - Sensitive credentials

Frontend environment variables:
- `VITE_API_URL`: Set in ConfigMap, points to backend service

### Storage Configuration

The application uses a 5Gi PVC for storing:
- Application data (JSON files)
- Uploaded documents
- Generated documents

To change storage size, edit [`openshift/persistent-volume-claim.yaml`](openshift/persistent-volume-claim.yaml):

```yaml
resources:
  requests:
    storage: 10Gi  # Change as needed
```

### Scaling

Scale frontend replicas:
```bash
oc scale deployment/los-frontend --replicas=3
```

Scale backend replicas (requires shared storage or external database):
```bash
oc scale deployment/los-backend --replicas=2
```

**Note**: Backend currently uses file-based storage. For multiple replicas, consider:
- Using IBM Cloud Object Storage for documents
- Implementing a shared database
- Using ReadWriteMany (RWX) storage class

## Monitoring and Troubleshooting

### View Pods

```bash
oc get pods
```

### View Logs

Backend logs:
```bash
oc logs -f deployment/los-backend
```

Frontend logs:
```bash
oc logs -f deployment/los-frontend
```

### View Events

```bash
oc get events --sort-by='.lastTimestamp'
```

### Check Pod Status

```bash
oc describe pod <pod-name>
```

### Access Pod Shell

```bash
oc rsh <pod-name>
```

### Check Resource Usage

```bash
oc adm top pods
oc adm top nodes
```

### View Routes

```bash
oc get routes
```

### Test Backend Health

```bash
BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')
curl https://${BACKEND_URL}/api/health
```

## Common Issues

### 1. Image Pull Errors

If you see `ImagePullBackOff`:
```bash
oc describe pod <pod-name>
```

Check if the build completed successfully:
```bash
oc get builds
oc logs build/<build-name>
```

### 2. CrashLoopBackOff

Check pod logs for errors:
```bash
oc logs <pod-name>
```

Common causes:
- Missing or incorrect secrets
- Database connection issues
- Application startup errors

### 3. Route Not Accessible

Check route configuration:
```bash
oc get route los-frontend -o yaml
```

Verify service endpoints:
```bash
oc get endpoints
```

### 4. Persistent Volume Issues

Check PVC status:
```bash
oc get pvc
oc describe pvc los-data-pvc
```

If PVC is pending, check available storage classes:
```bash
oc get storageclass
```

### 5. Secret Not Found

Verify secrets exist:
```bash
oc get secrets
oc describe secret los-secrets
```

## Updating the Application

### Update Backend Code

```bash
oc start-build los-backend --from-dir=./backend --follow
oc rollout restart deployment/los-backend
```

### Update Frontend Code

```bash
oc start-build los-frontend --from-dir=./frontend --follow
oc rollout restart deployment/los-frontend
```

### Update Configuration

```bash
oc apply -f openshift/configmap.yaml
oc rollout restart deployment/los-backend
oc rollout restart deployment/los-frontend
```

### Update Secrets

```bash
oc apply -f openshift/secrets.yaml
oc rollout restart deployment/los-backend
```

## Cleanup

### Delete All Resources

```bash
oc delete all -l app.kubernetes.io/part-of=loan-origination-system
oc delete pvc los-data-pvc
oc delete configmap los-config
oc delete secret los-secrets
```

### Delete Project

```bash
oc delete project los-demo
```

## Security Considerations

### Production Deployment Checklist

- [ ] Use strong, unique JWT secret
- [ ] Rotate secrets regularly
- [ ] Enable network policies
- [ ] Configure resource limits
- [ ] Enable pod security policies
- [ ] Use HTTPS for all routes (enabled by default)
- [ ] Implement backup strategy for PVC
- [ ] Configure monitoring and alerting
- [ ] Review and harden container images
- [ ] Implement proper RBAC
- [ ] Enable audit logging
- [ ] Configure egress network policies

### Network Policies

Create network policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: los-backend-policy
spec:
  podSelector:
    matchLabels:
      app: los-backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: los-frontend
    ports:
    - protocol: TCP
      port: 3001
```

## Demo Users

After deployment, use these credentials to access the application:

| Username | Password | Role | Capabilities |
|----------|----------|------|--------------|
| `rm1` | `password123` | Relationship Manager | Create applications, upload documents |
| `analyst1` | `password123` | Credit Analyst | Review analysis, submit recommendations |
| `approver1` | `password123` | Approver | Approve/reject applications |
| `admin` | `admin123` | Admin | Full access, policy configuration |

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review pod logs: `oc logs -f deployment/los-backend`
3. Check OpenShift events: `oc get events`
4. Review the main [README.md](README.md) for application details

## Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [OpenShift CLI Reference](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [IBM Watsonx.ai Documentation](https://www.ibm.com/docs/en/watsonx-as-a-service)
- [IBM Cloud Object Storage Documentation](https://cloud.ibm.com/docs/cloud-object-storage)