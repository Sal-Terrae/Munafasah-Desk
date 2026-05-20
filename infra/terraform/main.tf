terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
  }
  # Backend left local for first apply. After the first apply create a
  # GCS bucket and uncomment the block below + run `terraform init -migrate-state`.
  # backend "gcs" {
  #   bucket = "<your-tfstate-bucket>"
  #   prefix = "bidready-ksa"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable every API we depend on. Plain google_project_service blocks
# are idempotent and order-independent.
resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "compute.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sts.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}
