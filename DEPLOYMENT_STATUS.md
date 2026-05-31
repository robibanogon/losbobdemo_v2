# OpenShift Deployment Status

## Current Deployment

**Project Name:** `los_demo_v1`  
**Cluster:** `https://api.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com:6443`  
**User:** `kube:admin`  
**Status:** Deployment in progress (Terminal 1)

## What's Being Deployed

### Backend Service
- **Image:** Node.js 18 on Red Hat UBI8
- **Replicas:** 1
- **Resources:** 256Mi-512Mi RAM, 250m-500m CPU
- **Port:** 3001
- **Health Check:** `/health`

### Frontend Service
- **Image:** React + Nginx on Red Hat UBI8
- **Replicas:** 2
- **Resources:** 128Mi-256Mi RAM, 100m-200m CPU
- **Port:** 8080

### Storage
- **PVC:** `los-data-pvc`
- **Size:** 5Gi
- **Access Mode:** ReadWriteOnce

### Configuration
- **ConfigMap:** `los-config` (API URLs, Watsonx settings)
- **Secret:** `los-secrets` (API keys, credentials)

## Monitoring Commands

### Check Deployment Status
```bash
# View all resources
oc get all -n los_demo_v1

# Watch pods
watch oc get pods -n los_demo_v1

# Check deployment status
oc get deployments -n los_demo_v1
```

### View Build Progress
```bash
# List builds
oc get builds -n los_demo_v1

# Follow backend build
oc logs -f bc/los-backend -n los_demo_v1

# Follow frontend build
oc logs -f bc/los-frontend -n los_demo_v1
```

### View Application Logs
```bash
# Backend logs
oc logs -f deployment/los-backend -n los_demo_v1

# Frontend logs
oc logs -f deployment/los-frontend -n los_demo_v1
```

### Check Routes
```bash
# List routes
oc get routes -n los_demo_v1

# Get frontend URL
oc get route los-frontend -n los_demo_v1 -o jsonpath='{.spec.host}'

# Get backend URL
oc get route los-backend -n los_demo_v1 -o jsonpath='{.spec.host}'
```

## Expected Timeline

1. **Project Creation** - 5 seconds
2. **ConfigMap/Secrets** - 5 seconds
3. **PVC Creation** - 10 seconds
4. **Backend Build** - 3-5 minutes
5. **Frontend Build** - 3-5 minutes
6. **Deployments** - 1-2 minutes
7. **Data Initialization** - 30 seconds

**Total:** ~8-12 minutes

## Success Indicators

✓ All pods in "Running" state  
✓ Routes created with HTTPS URLs  
✓ Backend health check responds  
✓ Frontend accessible in browser  

## Troubleshooting

### If Build Fails
```bash
# Check build logs
oc get builds -n los_demo_v1
oc logs build/<build-name> -n los_demo_v1

# Retry build
oc start-build los-backend --from-dir=./backend --follow -n los_demo_v1
```

### If Pods Don't Start
```bash
# Describe pod
oc describe pod <pod-name> -n los_demo_v1

# Check events
oc get events -n los_demo_v1 --sort-by='.lastTimestamp'

# Check secrets
oc get secret los-secrets -n los_demo_v1
```

### If Routes Don't Work
```bash
# Check route
oc describe route los-frontend -n los_demo_v1

# Check service endpoints
oc get endpoints -n los_demo_v1
```

## After Deployment Completes

The deployment script will display:

```
========================================
Deployment Complete!
========================================

Frontend URL: https://los-frontend-los_demo_v1.apps.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com
Backend URL:  https://los-backend-los_demo_v1.apps.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com

Demo Users:
  - RM:       rm1 / password123
  - Analyst:  analyst1 / password123
  - Approver: approver1 / password123
  - Admin:    admin / admin123
```

## Testing the Deployment

### 1. Test Backend Health
```bash
BACKEND_URL=$(oc get route los-backend -n los_demo_v1 -o jsonpath='{.spec.host}')
curl https://${BACKEND_URL}/health
```

### 2. Test Backend Login
```bash
curl -X POST https://${BACKEND_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3. Access Frontend
Open in browser:
```bash
FRONTEND_URL=$(oc get route los-frontend -n los_demo_v1 -o jsonpath='{.spec.host}')
echo "https://${FRONTEND_URL}"
```

## Scaling

### Scale Frontend
```bash
oc scale deployment/los-frontend --replicas=3 -n los_demo_v1
```

### Scale Backend (requires shared storage)
```bash
oc scale deployment/los-backend --replicas=2 -n los_demo_v1
```

## Cleanup

### Delete All Resources
```bash
oc delete all -l app.kubernetes.io/part-of=loan-origination-system -n los_demo_v1
oc delete pvc los-data-pvc -n los_demo_v1
oc delete configmap los-config -n los_demo_v1
oc delete secret los-secrets -n los_demo_v1
```

### Delete Project
```bash
oc delete project los_demo_v1
```

## Files Created

- ✓ [`backend/Dockerfile`](backend/Dockerfile)
- ✓ [`frontend/Dockerfile`](frontend/Dockerfile)
- ✓ [`frontend/nginx.conf`](frontend/nginx.conf)
- ✓ [`openshift/backend-deployment.yaml`](openshift/backend-deployment.yaml)
- ✓ [`openshift/frontend-deployment.yaml`](openshift/frontend-deployment.yaml)
- ✓ [`openshift/services.yaml`](openshift/services.yaml)
- ✓ [`openshift/routes.yaml`](openshift/routes.yaml)
- ✓ [`openshift/configmap.yaml`](openshift/configmap.yaml)
- ✓ [`openshift/secrets.yaml`](openshift/secrets.yaml) (with your credentials)
- ✓ [`openshift/persistent-volume-claim.yaml`](openshift/persistent-volume-claim.yaml)
- ✓ [`openshift/deploy.sh`](openshift/deploy.sh)
- ✓ [`OPENSHIFT_DEPLOYMENT.md`](OPENSHIFT_DEPLOYMENT.md)
- ✓ [`DEPLOYMENT_NEXT_STEPS.md`](DEPLOYMENT_NEXT_STEPS.md)

## Next Steps

1. Wait for Terminal 1 to complete (8-12 minutes)
2. Note the Frontend and Backend URLs displayed
3. Access the Frontend URL in your browser
4. Login with demo credentials
5. Test the application functionality

---

**Deployment initiated:** 2026-05-31 10:28 UTC+8  
**Expected completion:** 2026-05-31 10:36-10:40 UTC+8