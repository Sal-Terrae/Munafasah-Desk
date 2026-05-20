resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = var.artifact_repo_id
  description   = "Container images for BidReady KSA"
  format        = "DOCKER"
  depends_on    = [google_project_service.required]
}
