# BidReady KSA — Terraform

Minimum GCP infrastructure for the API and web shell. Targets Saudi
data-residency (`me-central2` by default) and uses Workload Identity
Federation so GitHub Actions never holds a service-account JSON key.

## One-time bootstrap

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

cd infra/terraform
terraform init
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

`api_image` and `web_image` are intentionally empty by default — the
Cloud Run services are only created once CI pushes the first images.

## Set the JWT signing secret (out-of-band, never in TF state)

```bash
openssl rand -base64 48 | tr -d '\n' | \
  gcloud secrets versions add jwt-secret --data-file=- --project YOUR_PROJECT_ID
```

## Wire CI

After `terraform apply`, copy these into GitHub repo secrets:

| GitHub secret | Source |
|---|---|
| `GCP_PROJECT_ID` | `YOUR_PROJECT_ID` |
| `GCP_REGION` | `me-central2` (or your chosen region) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `terraform output -raw wif_provider` |
| `GCP_DEPLOY_SA_EMAIL` | `terraform output -raw deploy_service_account_email` |
| `GCP_ARTIFACT_REGISTRY` | `terraform output -raw artifact_registry_repo` |

Then push a commit to `main` — `.github/workflows/api-deploy.yml` and
`web-deploy.yml` build + push + roll out.

## What this *doesn't* set up

- A custom domain / managed certificate (Cloud Run gives a `run.app`
  URL by default; bring your own domain via Cloud DNS + Cloud Run
  domain mappings later).
- VPC connector / private Cloud SQL IP (uses public IP + the proxy's
  unix socket — fine for first deploy, switch to private when load
  warrants).
- Cloud Scheduler for the daily retention sweep (lands with P12b).
- A VPC + firewall ruleset (not needed until we have private services).
- Pub/Sub for the worker pipeline (lands with P12b).
