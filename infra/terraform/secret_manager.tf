# JWT signing secret. Owner-rotated. Terraform creates the secret
# *resource* but the operator sets the *value* once via the gcloud CLI
# to keep the secret out of Terraform state:
#
#   echo -n "$(openssl rand -base64 48)" | gcloud secrets versions add jwt-secret --data-file=-
#
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.required]
}

# DB password — Terraform writes the random password it generated so
# Cloud Run can read it. The Cloud SQL user resource and this secret
# are kept in sync by depending on the same random_password.
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}
