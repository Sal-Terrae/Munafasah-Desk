# Cloud Scheduler triggers the API's daily retention sweep at 02:00
# Asia/Riyadh via an HTTP target with a Google-minted OIDC ID token.
# The API verifies the token via `SchedulerOidcGuard` (jwks +
# audience match + email match). No shared secret; no SA JSON key.
#
# Counted on the api service being deployed (var.api_image set).

resource "google_service_account" "scheduler" {
  account_id   = "bidready-scheduler"
  display_name = "BidReady KSA Cloud Scheduler caller"
}

# Allow Cloud Scheduler to mint OIDC tokens for its own SA.
resource "google_service_account_iam_member" "scheduler_token_creator" {
  service_account_id = google_service_account.scheduler.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

data "google_project" "this" {}

# Allow the scheduler SA to *invoke* the Cloud Run service.
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoke_api" {
  count    = length(google_cloud_run_v2_service.api) > 0 ? 1 : 0
  location = google_cloud_run_v2_service.api[0].location
  name     = google_cloud_run_v2_service.api[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# Per-org sweep job. Operators add one google_cloud_scheduler_job per
# tenant they want to auto-sweep; for the pilot org we wire a single
# default. Add more by setting `var.scheduler_tenant_org_ids`.

variable "scheduler_tenant_org_ids" {
  description = "Organization IDs to enrol in the daily retention sweep."
  type        = list(string)
  default     = []
}

resource "google_cloud_scheduler_job" "retention_sweep" {
  for_each = length(google_cloud_run_v2_service.api) > 0 ? toset(var.scheduler_tenant_org_ids) : toset([])

  name        = "bidready-retention-sweep-${each.key}"
  description = "Daily PDPL retention sweep for org ${each.key}"
  schedule    = "0 2 * * *"
  time_zone   = "Asia/Riyadh"
  region      = var.region
  attempt_deadline = "300s"

  retry_config {
    retry_count          = 2
    min_backoff_duration = "30s"
    max_backoff_duration = "300s"
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.api[0].uri}/retention-actions/sweep-scheduled"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode(jsonencode({
      organizationId = each.key
    }))
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      # Audience must equal the URL the API checks SCHEDULER_OIDC_AUDIENCE against.
      audience = "${google_cloud_run_v2_service.api[0].uri}/retention-actions/sweep-scheduled"
    }
  }

  depends_on = [
    google_service_account_iam_member.scheduler_token_creator,
    google_cloud_run_v2_service_iam_member.scheduler_invoke_api,
  ]
}
