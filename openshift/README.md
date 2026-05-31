# OpenShift Deployment Files

This directory contains all the necessary Kubernetes/OpenShift configuration files to deploy the Loan Origination System to Red Hat OpenShift.

## Files Overview

### Container Images
- **`../backend/Dockerfile`** - Backend Node.js application container
- **`../frontend/Dockerfile`** - Frontend React application container (multi-stage build)
- **`../frontend/nginx.conf`** - Nginx configuration for serving frontend

### Kubernetes Resources
- **`backend-deployment.yaml`** - Backend deployment configuration (1 replica)
- **`frontend-deployment.yaml`** - Frontend deployment configuration (2 replicas)
- **`services.yaml`** - Service definitions for backend and frontend
- **`routes.yaml`** - OpenShift routes for external access (HTTPS)
- **`configmap.yaml`** - Non-sensitive configuration values
- **`secrets.yaml.template`** - Template for sensitive credentials (DO NOT commit actual secrets)
- **`persistent-volume-claim.yaml`** - 5Gi storage for application data

### Deployment Tools
- **`deploy.sh`** - Automated deployment script
- **`README.md`** - This file

## Quick Start

1. **Login to OpenShift**
   ```bash
   oc login <your-cluster-url>
   ```

2. **Configure Secrets**
   ```bash
   cp secrets.yaml.template secrets.yaml
   # Edit secrets.yaml with your actual credentials
   ```

3. **Deploy**
   ```bash
   ./deploy.sh
   ```

For detailed instructions, see [OPENSHIFT_DEPLOYMENT.md](../OPENSHIFT_DEPLOYMENT.md)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenShift Cluster                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │                  los-demo Project                   │    │
│  │                                                      │    │
│  │  ┌──────────────┐         ┌──────────────┐        │    │
│  │  │   Frontend   │         │   Backend    │        │    │
│  │  │   (Nginx)    │────────▶│  (Node.js)   │        │    │
│  │  │  2 replicas  │         │  1 replica   │        │    │
│  │  └──────────────┘         └──────┬───────┘        │    │
│  │         │                         │                 │    │
│  │         │                         │                 │    │
│  │    ┌────▼─────┐            ┌─────▼──────┐         │    │
│  │    │  Route   │            │    PVC     │         │    │
│  │    │ (HTTPS)  │            │   (5Gi)    │         │    │
│  │    └──────────┘            └────────────┘         │    │
│  │                                                      │    │
│  │  ┌──────────────┐         ┌──────────────┐        │    │
│  │  │  ConfigMap   │         │   Secrets    │        │    │
│  │  └──────────────┘         └──────────────┘        │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Resource Requirements

### Backend
- **CPU**: 250m (request) / 500m (limit)
- **Memory**: 256Mi (request) / 512Mi (limit)
- **Storage**: Shared 5Gi PVC

### Frontend
- **CPU**: 100m (request) / 200m (limit)
- **Memory**: 128Mi (request) / 256Mi (limit)
- **Replicas**: 2 (for high availability)

### Total Cluster Requirements
- **CPU**: ~600m
- **Memory**: ~1Gi
- **Storage**: 5Gi

## Configuration

### Environment Variables (ConfigMap)
- `api-url`: Backend API URL
- `watsonx-api-url`: IBM Watsonx.ai API endpoint
- `watsonx-default-model`: Default AI model
- `ibm-cos-endpoint`: IBM Cloud Object Storage endpoint (optional)
- `ibm-cos-bucket-name`: COS bucket name (optional)

### Secrets
- `jwt-secret`: JWT signing secret
- `watsonx-api-key`: IBM Watsonx.ai API key
- `watsonx-project-id`: IBM Watsonx.ai project ID
- `ibm-cos-api-key`: IBM COS API key (optional)
- `ibm-cos-instance-id`: IBM COS instance ID (optional)

## Deployment Workflow

The `deploy.sh` script performs these steps:

1. ✓ Verify OpenShift CLI and authentication
2. ✓ Create/switch to project
3. ✓ Apply ConfigMap
4. ✓ Apply Secrets
5. ✓ Create Persistent Volume Claim
6. ✓ Build backend container image
7. ✓ Build frontend container image
8. ✓ Deploy backend application
9. ✓ Deploy frontend application
10. ✓ Create services
11. ✓ Create routes
12. ✓ Wait for deployments to be ready
13. ✓ Initialize application data
14. ✓ Display access URLs

## Monitoring

### View Application Status
```bash
oc get pods
oc get deployments
oc get services
oc get routes
```

### View Logs
```bash
# Backend logs
oc logs -f deployment/los-backend

# Frontend logs
oc logs -f deployment/los-frontend
```

### Check Health
```bash
# Backend health
BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')
curl https://${BACKEND_URL}/health

# Frontend health
FRONTEND_URL=$(oc get route los-frontend -o jsonpath='{.spec.host}')
curl https://${FRONTEND_URL}/
```

## Scaling

### Scale Frontend
```bash
oc scale deployment/los-frontend --replicas=3
```

### Scale Backend
```bash
# Note: Backend uses file-based storage
# For multiple replicas, consider using IBM COS or shared storage
oc scale deployment/los-backend --replicas=2
```

## Updates

### Update Backend
```bash
oc start-build los-backend --from-dir=../backend --follow
oc rollout restart deployment/los-backend
```

### Update Frontend
```bash
oc start-build los-frontend --from-dir=../frontend --follow
oc rollout restart deployment/los-frontend
```

### Update Configuration
```bash
oc apply -f configmap.yaml
oc rollout restart deployment/los-backend
oc rollout restart deployment/los-frontend
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

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   oc get builds
   oc logs build/<build-name>
   ```

2. **Pod Crashes**
   ```bash
   oc describe pod <pod-name>
   oc logs <pod-name>
   ```

3. **Route Not Accessible**
   ```bash
   oc get route
   oc describe route los-frontend
   ```

4. **Storage Issues**
   ```bash
   oc get pvc
   oc describe pvc los-data-pvc
   ```

## Security Notes

- Never commit `secrets.yaml` to version control
- Use strong, unique JWT secrets
- Rotate credentials regularly
- Enable network policies in production
- Review and harden container images
- Implement proper RBAC

## Support

For detailed deployment instructions and troubleshooting, see:
- [OPENSHIFT_DEPLOYMENT.md](../OPENSHIFT_DEPLOYMENT.md) - Complete deployment guide
- [README.md](../README.md) - Application documentation

## Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [IBM Watsonx.ai](https://www.ibm.com/docs/en/watsonx-as-a-service)