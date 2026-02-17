# Workload Identity Federation Setup for GitHub Actions

This workflow uses Workload Identity Federation to authenticate with Google Cloud without storing service account keys.

## Prerequisites

- GCP project: `edgeshop-2026`
- A GCP service account with `roles/artifactregistry.writer` permission
- GitHub repository: `kirtquist/mmitm-mobile`

## Setup Steps

### 1. Create a Service Account (if not exists)

```bash
gcloud iam service-accounts create github-actions-sa \
  --project=edgeshop-2026 \
  --display-name="GitHub Actions Service Account"
```

### 2. Grant Artifact Registry Writer Role

```bash
gcloud projects add-iam-policy-binding edgeshop-2026 \
  --member="serviceAccount:github-actions-sa@edgeshop-2026.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

### 3. Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-pool \
  --project=edgeshop-2026 \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

### 4. Create Workload Identity Provider

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=edgeshop-2026 \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='kirtquist/mmitm-mobile'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 5. Allow GitHub to Impersonate Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding github-actions-sa@edgeshop-2026.iam.gserviceaccount.com \
  --project=edgeshop-2026 \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/kirtquist/mmitm-mobile"
```

**Note:** Replace `PROJECT_NUMBER` with your actual GCP project number:
```bash
gcloud projects describe edgeshop-2026 --format="value(projectNumber)"
```

### 6. Get the Workload Identity Provider Resource Name

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=edgeshop-2026 \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"
```

This will output something like:
```
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

### 7. Add GitHub Secrets

In your GitHub repository (`kirtquist/mmitm-mobile`), go to:
**Settings → Secrets and variables → Actions → New repository secret**

Add two secrets:

1. **`WIF_PROVIDER`**: The full resource name from step 6
   - Example: `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

2. **`WIF_SERVICE_ACCOUNT`**: The service account email
   - Example: `github-actions-sa@edgeshop-2026.iam.gserviceaccount.com`

## Verification

After setup, push to the `main` branch and check the GitHub Actions workflow. The `build-docker` job should:
1. Authenticate successfully
2. Build the Docker image
3. Push to Artifact Registry: `us-west1-docker.pkg.dev/edgeshop-2026/edge-shop/mmitm-mobile`

## Alternative: Quick Setup Script

You can also use this script (replace `PROJECT_NUMBER`):

```bash
PROJECT_ID="edgeshop-2026"
PROJECT_NUMBER="YOUR_PROJECT_NUMBER"  # Get from: gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
REPO="kirtquist/mmitm-mobile"
SA_NAME="github-actions-sa"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Create WIF pool
gcloud iam workload-identity-pools create github-pool \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create WIF provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Bind service account
gcloud iam service-accounts add-iam-policy-binding ${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${REPO}"

# Get provider name
echo "WIF_PROVIDER value:"
gcloud iam workload-identity-pools providers describe github-provider \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"

echo "WIF_SERVICE_ACCOUNT value: ${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```
