output "artifact_registry_repo" {
  description = "Path used by the deploy workflow to push images."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "sql_connection_name" {
  description = "Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)."
  value       = google_sql_database_instance.pg.connection_name
}

output "api_url" {
  description = "Cloud Run URL for the API service (only available once `api_image` is set)."
  value       = length(google_cloud_run_v2_service.api) > 0 ? google_cloud_run_v2_service.api[0].uri : null
}

output "web_url" {
  description = "Cloud Run URL for the web shell (only available once `web_image` is set)."
  value       = length(google_cloud_run_v2_service.web) > 0 ? google_cloud_run_v2_service.web[0].uri : null
}

output "wif_provider" {
  description = "Full WIF provider resource — paste into GitHub Actions auth step."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_service_account_email" {
  description = "Service account impersonated by GitHub Actions via WIF."
  value       = google_service_account.deploy.email
}
