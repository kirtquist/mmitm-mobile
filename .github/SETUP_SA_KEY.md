# Service Account Key Setup for GitHub Actions

This workflow uses a service account key for authentication. While Workload Identity Federation is more secure, this method is simpler to set up initially.

## Quick Setup

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

### 3. Create and Download Service Account Key

```bash
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-sa@edgeshop-2026.iam.gserviceaccount.com \
  --project=edgeshop-2026
```

### 4. Add GitHub Secret

1. Go to your GitHub repository: `https://github.com/kirtquist/mmitm-mobile`
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `GCP_SA_KEY`
5. Value: Paste the entire contents of `github-actions-key.json` (the JSON file from step 3)
6. Click **Add secret**

### 5. Clean Up Local Key File

**Important:** Delete the local key file after adding it to GitHub:

```bash
rm github-actions-key.json
```

## Security Notes

- ⚠️ Service account keys are long-lived credentials. Keep them secure.
- ✅ The key is stored as a GitHub secret (encrypted at rest).
- 🔄 Consider migrating to Workload Identity Federation later for better security (see SETUP_WIF.md).

## Verification

After setup, push to the `main` branch and check the GitHub Actions workflow. The `build-docker` job should:
1. Authenticate successfully
2. Build the Docker image
3. Push to Artifact Registry: `us-west1-docker.pkg.dev/edgeshop-2026/edge-shop/mmitm-mobile`

## Rotating the Key

If you need to rotate the key:

1. Create a new key (follow steps 3-4 above)
2. Update the `GCP_SA_KEY` secret in GitHub
3. Delete the old key:
   ```bash
   gcloud iam service-accounts keys list \
     --iam-account=github-actions-sa@edgeshop-2026.iam.gserviceaccount.com \
     --project=edgeshop-2026
   
   # Delete the old key (replace KEY_ID with actual key ID)
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=github-actions-sa@edgeshop-2026.iam.gserviceaccount.com \
     --project=edgeshop-2026
   ```
