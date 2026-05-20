variable "project_id" {
  description = "GCP project ID hosting the BidReady KSA workloads."
  type        = string
}

variable "region" {
  description = "GCP region. Choose `me-central2` (Dammam) for Saudi residency."
  type        = string
  default     = "me-central2"
}

variable "artifact_repo_id" {
  description = "Artifact Registry repository ID for container images."
  type        = string
  default     = "bidready-ksa"
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name."
  type        = string
  default     = "bidready-pg"
}

variable "sql_database_name" {
  description = "Application database name inside the Cloud SQL instance."
  type        = string
  default     = "bidready"
}

variable "sql_user_name" {
  description = "Application DB role used by the API."
  type        = string
  default     = "bidready"
}

variable "sql_tier" {
  description = "Cloud SQL machine tier. Small for first deploy; scale as needed."
  type        = string
  default     = "db-f1-micro"
}

variable "api_image" {
  description = "Fully qualified container image for the API (set by CI on each deploy)."
  type        = string
  # Default points at the latest tag; CI overrides per build.
  default = ""
}

variable "web_image" {
  description = "Fully qualified container image for the web shell (set by CI on each deploy)."
  type        = string
  default     = ""
}

variable "cors_origin" {
  description = "Allowed CORS origin for the web shell (comma-separated)."
  type        = string
  default     = "https://example.invalid"
}

variable "github_repository" {
  description = "GitHub repository in `owner/repo` form. WIF allows this repo to impersonate the deploy SA."
  type        = string
  default     = "ZeeshanAmjad0495/Munafasah-Desk"
}

variable "github_main_branch" {
  description = "Branch allowed to deploy via WIF."
  type        = string
  default     = "main"
}
