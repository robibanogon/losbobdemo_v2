#!/bin/bash

# OpenShift Deployment Script for Loan Origination System
# This script deploys the LOS application to Red Hat OpenShift

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="${OPENSHIFT_PROJECT:-los-demo-v1}"
REGISTRY="${OPENSHIFT_REGISTRY:-image-registry.openshift-image-stream.svc:5000}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Loan Origination System - OpenShift Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if oc is installed
if ! command -v oc &> /dev/null; then
    echo -e "${RED}Error: OpenShift CLI (oc) is not installed${NC}"
    echo "Please install it from: https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html"
    exit 1
fi

# Check if logged in to OpenShift
if ! oc whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to OpenShift${NC}"
    echo "Please login using: oc login <cluster-url>"
    exit 1
fi

echo -e "${GREEN}✓ OpenShift CLI found and authenticated${NC}"
echo ""

# Create or switch to project
echo -e "${YELLOW}Creating/switching to project: ${PROJECT_NAME}${NC}"
oc new-project ${PROJECT_NAME} 2>/dev/null || oc project ${PROJECT_NAME}
echo ""

# Check if secrets file exists
if [ ! -f "openshift/secrets.yaml" ]; then
    echo -e "${RED}Error: secrets.yaml not found${NC}"
    echo "Please create openshift/secrets.yaml from openshift/secrets.yaml.template"
    echo "and fill in your actual credentials."
    exit 1
fi

# Apply ConfigMap
echo -e "${YELLOW}Applying ConfigMap...${NC}"
oc apply -f openshift/configmap.yaml
echo -e "${GREEN}✓ ConfigMap applied${NC}"
echo ""

# Apply Secrets
echo -e "${YELLOW}Applying Secrets...${NC}"
oc apply -f openshift/secrets.yaml
echo -e "${GREEN}✓ Secrets applied${NC}"
echo ""

# Apply Persistent Volume Claim
echo -e "${YELLOW}Creating Persistent Volume Claim...${NC}"
oc apply -f openshift/persistent-volume-claim.yaml
echo -e "${GREEN}✓ PVC created${NC}"
echo ""

# Build Backend Image
echo -e "${YELLOW}Building backend image...${NC}"
oc new-build --name=los-backend --binary --strategy=docker || true
oc start-build los-backend --from-dir=./backend --follow
echo -e "${GREEN}✓ Backend image built${NC}"
echo ""

# Build Frontend Image
echo -e "${YELLOW}Building frontend image...${NC}"
oc new-build --name=los-frontend --binary --strategy=docker || true
oc start-build los-frontend --from-dir=./frontend --follow
echo -e "${GREEN}✓ Frontend image built${NC}"
echo ""

# Apply Deployments
echo -e "${YELLOW}Deploying backend...${NC}"
oc apply -f openshift/backend-deployment.yaml
echo -e "${GREEN}✓ Backend deployment created${NC}"
echo ""

echo -e "${YELLOW}Deploying frontend...${NC}"
oc apply -f openshift/frontend-deployment.yaml
echo -e "${GREEN}✓ Frontend deployment created${NC}"
echo ""

# Apply Services
echo -e "${YELLOW}Creating services...${NC}"
oc apply -f openshift/services.yaml
echo -e "${GREEN}✓ Services created${NC}"
echo ""

# Apply Routes
echo -e "${YELLOW}Creating routes...${NC}"
oc apply -f openshift/routes.yaml
echo -e "${GREEN}✓ Routes created${NC}"
echo ""

# Wait for deployments to be ready
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
oc rollout status deployment/los-backend --timeout=5m
oc rollout status deployment/los-frontend --timeout=5m
echo -e "${GREEN}✓ All deployments ready${NC}"
echo ""

# Initialize data (seed database)
echo -e "${YELLOW}Initializing application data...${NC}"
BACKEND_POD=$(oc get pods -l app=los-backend -o jsonpath='{.items[0].metadata.name}')
oc exec ${BACKEND_POD} -- npm run seed
echo -e "${GREEN}✓ Data initialized${NC}"
echo ""

# Get route URLs
FRONTEND_URL=$(oc get route los-frontend -o jsonpath='{.spec.host}')
BACKEND_URL=$(oc get route los-backend -o jsonpath='{.spec.host}')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Frontend URL: ${GREEN}https://${FRONTEND_URL}${NC}"
echo -e "Backend URL:  ${GREEN}https://${BACKEND_URL}${NC}"
echo ""
echo -e "${YELLOW}Demo Users:${NC}"
echo "  - RM:       rm1 / password123"
echo "  - Analyst:  analyst1 / password123"
echo "  - Approver: approver1 / password123"
echo "  - Admin:    admin / admin123"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View pods:        oc get pods"
echo "  View logs:        oc logs -f deployment/los-backend"
echo "  View routes:      oc get routes"
echo "  Scale frontend:   oc scale deployment/los-frontend --replicas=3"
echo "  Delete all:       oc delete all -l app.kubernetes.io/part-of=loan-origination-system"
echo ""

# Made with Bob
