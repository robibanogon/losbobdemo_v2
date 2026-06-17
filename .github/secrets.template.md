# GitHub Secrets Configuration Template

Copy this template and fill in your actual values. Then add these secrets to your GitHub repository.

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

## Required Secrets

### OpenShift Configuration

```
Name: OPENSHIFT_SERVER
Value: https://api.your-cluster.example.com:6443
Description: OpenShift cluster API URL
How to get: Run `oc whoami --show-server`
```

```
Name: OPENSHIFT_TOKEN
Value: sha256~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Description: Service account token for GitHub Actions
How to get: Run `oc create token github-actions --duration=8760h`
```

```
Name: OPENSHIFT_PROJECT
Value: los-demo-v1
Description: OpenShift project/namespace name
How to get: Your project name (e.g., los-demo-v1)
```

### Application Secrets

```
Name: JWT_SECRET
Value: [Generate using: openssl rand -base64 32]
Description: Secret key for JWT token signing
Example: xK8vN2mP9qR4sT6uW8yZ1aB3cD5eF7gH9iJ0kL2mN4oP6qR8sT0u
```

### IBM Watsonx.ai Configuration

```
Name: WATSONX_API_KEY
Value: [Your IBM Cloud API Key]
Description: IBM Watsonx.ai API key
How to get: https://cloud.ibm.com/iam/apikeys
```

```
Name: WATSONX_PROJECT_ID
Value: [Your Watsonx.ai Project ID]
Description: IBM Watsonx.ai project identifier
How to get: From your Watsonx.ai project settings
```

## Optional Secrets (IBM Cloud Object Storage)

Only required if using IBM Cloud Object Storage for document storage.

```
Name: IBM_COS_API_KEY
Value: [Your IBM Cloud API Key with COS access]
Description: IBM Cloud Object Storage API key
How to get: https://cloud.ibm.com/iam/apikeys
```

```
Name: IBM_COS_INSTANCE_ID
Value: crn:v1:bluemix:public:cloud-object-storage:global:a/xxxxx:xxxxx::
Description: IBM COS instance CRN
How to get: From IBM Cloud Object Storage instance details
```

## Quick Setup Commands

### Generate Secure Random Secrets

```bash
# Generate JWT secret (32 bytes, base64 encoded)
openssl rand -base64 32

# Generate another random secret (32 bytes, hex encoded)
openssl rand -hex 32

# Generate UUID
uuidgen
```

### Get OpenShift Information

```bash
# Login to OpenShift
oc login https://api.your-cluster.example.com:6443

# Get server URL
oc whoami --show-server

# Create service account
oc create serviceaccount github-actions

# Grant permissions
oc policy add-role-to-user admin system:serviceaccount:los-demo-v1:github-actions

# Generate token (valid for 1 year)
oc create token github-actions --duration=8760h
```

### Get IBM Cloud Information

```bash
# Login to IBM Cloud
ibmcloud login

# List API keys
ibmcloud iam api-keys

# Create new API key
ibmcloud iam api-key-create github-actions-key -d "API key for GitHub Actions"

# List COS instances
ibmcloud resource service-instances --service-name cloud-object-storage

# Get COS instance CRN
ibmcloud resource service-instance "your-cos-instance-name" --output json | jq -r '.crn'
```

## Verification Checklist

Before running the workflow, verify:

- [ ] `OPENSHIFT_SERVER` - Correct cluster URL
- [ ] `OPENSHIFT_TOKEN` - Valid service account token
- [ ] `OPENSHIFT_PROJECT` - Project exists in OpenShift
- [ ] `JWT_SECRET` - Strong random string (min 32 characters)
- [ ] `WATSONX_API_KEY` - Valid IBM Cloud API key
- [ ] `WATSONX_PROJECT_ID` - Valid Watsonx.ai project ID
- [ ] `IBM_COS_API_KEY` - (Optional) Valid if using COS
- [ ] `IBM_COS_INSTANCE_ID` - (Optional) Valid if using COS

## Testing Secrets

### Test OpenShift Connection

```bash
# Test with your token
oc login --token=<your-token> --server=<your-server>

# Verify access
oc whoami
oc project <your-project>
oc get pods
```

### Test IBM Watsonx.ai API Key

```bash
# Test API key (replace with your key and project ID)
curl -X POST "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29" \
  -H "Authorization: Bearer $(ibmcloud iam oauth-tokens --output json | jq -r '.iam_token')" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "ibm/granite-13b-chat-v2",
    "input": "Hello",
    "parameters": {
      "max_new_tokens": 10
    },
    "project_id": "your-project-id"
  }'
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `.github/secrets.md` to `.gitignore`
   - Use this template file only

2. **Rotate secrets regularly**
   - OpenShift tokens: Every 90 days
   - API keys: Every 180 days
   - JWT secrets: Every 365 days

3. **Use environment-specific secrets**
   - Create separate secrets for dev/staging/prod
   - Use GitHub Environments feature

4. **Limit token permissions**
   - Use minimum required permissions
   - Create separate service accounts per environment

5. **Monitor secret usage**
   - Review GitHub Actions logs
   - Check OpenShift audit logs
   - Monitor IBM Cloud activity

## Troubleshooting

### Secret Not Found

**Error**: `Error: Secret "OPENSHIFT_TOKEN" not found`

**Solution**:
1. Verify secret name is exactly correct (case-sensitive)
2. Check secret is added to repository (not organization)
3. Ensure you have admin access to repository

### Invalid Token

**Error**: `error: You must be logged in to the server (Unauthorized)`

**Solution**:
1. Regenerate token: `oc create token github-actions --duration=8760h`
2. Update GitHub secret with new token
3. Verify service account has correct permissions

### API Key Invalid

**Error**: `401 Unauthorized` from Watsonx.ai

**Solution**:
1. Verify API key is correct
2. Check API key has Watsonx.ai access
3. Verify project ID is correct
4. Regenerate API key if needed

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OpenShift Service Accounts](https://docs.openshift.com/container-platform/latest/authentication/using-service-accounts-in-applications.html)
- [IBM Cloud API Keys](https://cloud.ibm.com/docs/account?topic=account-userapikey)
- [Setup Guide](.github/SETUP_GUIDE.md)

---

**Important**: Delete this file after configuring your secrets, or ensure it's in `.gitignore`