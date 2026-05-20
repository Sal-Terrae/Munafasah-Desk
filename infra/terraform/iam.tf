# --- Runtime service accounts ----------------------------------------

resource "google_service_account" "api_runtime" {
  account_id   = "bidready-api"
  display_name = "BidReady KSA API runtime"
}

resource "google_service_account" "web_runtime" {
  account_id   = "bidready-web"
  display_name = "BidReady KSA Web runtime"
}

# API needs: read its secrets; connect to Cloud SQL.
resource "google_secret_manager_secret_iam_member" "api_jwt" {
  secret_id = google_secret_manager_secret.jwt_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "api_db" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "api_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

# Web shell needs nothing other than the right to be invoked itself.

# --- Deploy service account (used via WIF from GitHub Actions) -------

resource "google_service_account" "deploy" {
  account_id   = "bidready-deploy"
  display_name = "BidReady KSA CI deploy"
}

resource "google_project_iam_member" "deploy_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_project_iam_member" "deploy_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deploy.email}"
}

# Cloud Run admin must impersonate the runtime SAs to deploy them.
resource "google_service_account_iam_member" "deploy_actAs_api" {
  service_account_id = google_service_account.api_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_service_account_iam_member" "deploy_actAs_web" {
  service_account_id = google_service_account.web_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}
