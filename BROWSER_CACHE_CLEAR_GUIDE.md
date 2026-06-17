# Browser Cache Clear Guide

## Issue
After deploying the fix for "Failed to save application" error, you may still see the error due to browser caching of the old JavaScript files.

## Verification
The fix has been successfully deployed to OpenShift:
- **Deployment Time**: 2026-06-17 06:19:15 UTC
- **JavaScript File**: index-Cli_Xrdi.js
- **Verified**: Code contains correct `loan_request`, `financial_snapshot`, and `owner_info` field names

## Solution: Clear Browser Cache

### Option 1: Hard Refresh (Recommended)
1. Open the application in your browser
2. Press the following key combination:
   - **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
   - **Mac**: `Cmd + Shift + R`
3. This will force the browser to reload all resources from the server

### Option 2: Clear Cache via Browser Settings

#### Chrome/Edge
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Choose "All time" from the time range dropdown
4. Click "Clear data"
5. Reload the application

#### Firefox
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cache"
3. Choose "Everything" from the time range dropdown
4. Click "Clear Now"
5. Reload the application

#### Safari
1. Go to Safari > Preferences > Advanced
2. Check "Show Develop menu in menu bar"
3. Go to Develop > Empty Caches
4. Reload the application

### Option 3: Incognito/Private Mode
1. Open a new incognito/private window:
   - **Chrome/Edge**: `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
   - **Firefox**: `Ctrl + Shift + P` (Windows) or `Cmd + Shift + P` (Mac)
   - **Safari**: `Cmd + Shift + N`
2. Navigate to the application URL
3. Test creating a new application

### Option 4: Developer Tools Cache Disable
1. Open Developer Tools:
   - **Windows/Linux**: `F12` or `Ctrl + Shift + I`
   - **Mac**: `Cmd + Option + I`
2. Go to the Network tab
3. Check "Disable cache" checkbox
4. Keep Developer Tools open
5. Reload the page

## Verification Steps

After clearing cache, verify the fix is working:

1. **Check JavaScript File**
   - Open Developer Tools (F12)
   - Go to Network tab
   - Reload the page
   - Look for `index-Cli_Xrdi.js` in the list
   - Verify it's being loaded (not from cache)

2. **Test Application Creation**
   - Navigate to Create Application page
   - Fill in all required fields:
     - Applicant Name
     - Business Type
     - Industry
     - Years in Business
     - Loan Amount
     - Tenor (months)
     - Purpose
     - Repayment Type
     - Monthly Revenue
     - Monthly Expenses
     - Existing Debt Payment
     - Collateral Type
     - Collateral Value
     - Owner Name
     - Owner ID Number
     - Credit Score
   - Click "Create Application"
   - Verify success message appears
   - Verify you're redirected to the application detail page

3. **Check Network Request**
   - Open Developer Tools
   - Go to Network tab
   - Try creating an application
   - Look for the POST request to `/api/applications`
   - Click on it to see the request payload
   - Verify it contains:
     ```json
     {
       "applicant": {
         "legal_name": "...",
         "business_type": "...",
         ...
       },
       "loan_request": {
         "amount": ...,
         "tenor_months": ...,
         ...
       },
       "financial_snapshot": {
         "monthly_revenue": ...,
         ...
       },
       "owner_info": {
         "name": "...",
         ...
       }
     }
     ```

## Still Having Issues?

If you still see the error after clearing cache:

1. **Check Console for Errors**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for any error messages
   - Share the error details

2. **Check Network Response**
   - Open Developer Tools
   - Go to Network tab
   - Try creating an application
   - Click on the failed POST request
   - Go to Response tab
   - Share the error response

3. **Verify Backend Logs**
   ```bash
   oc logs -n los-demo-v1 deployment/los-backend --tail=100
   ```

## Application URLs

- **Frontend**: https://los-frontend-los-demo-v1.apps.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com
- **Backend**: https://los-backend-los-demo-v1.apps.itz-h3g1a8.infra01-lb.syd05.techzone.ibm.com

## Technical Details

The fix changed the frontend to send snake_case field names that match the backend expectations:
- `applicant.legalName` → `applicant.legal_name`
- `loan` → `loan_request`
- `financial` → `financial_snapshot`
- `owner` → `owner_info`

This fix is confirmed deployed and active in the OpenShift environment.