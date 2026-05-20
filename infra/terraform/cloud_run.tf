# API Cloud Run service. CI sets var.api_image to the just-pushed
# Artifact Registry image. DATABASE_URL is composed at deploy time
# from the Cloud SQL instance connection name + the DB-password secret.

resource "google_cloud_run_v2_service" "api" {
  count    = var.api_image == "" ? 0 : 1
  name     = "bidready-api"
  location = var.region

  template {
    service_account = google_service_account.api_runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.pg.connection_name]
      }
    }

    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "API_PORT"
        value = "8080"
      }
      env {
        name  = "CORS_ORIGIN"
        value = var.cors_origin
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DATABASE_URL"
        # Cloud SQL Auth Proxy unix socket. The username + DB are
        # known at deploy time; the password is injected via Secret Manager.
        value = format(
          "postgresql://%s:$${DB_PASSWORD}@localhost/%s?host=/cloudsql/%s",
          var.sql_user_name,
          var.sql_database_name,
          google_sql_database_instance.pg.connection_name,
        )
      }
      # P12c: Cloud Scheduler's OIDC ID token is verified against this
      # exact audience + caller email.
      env {
        name  = "SCHEDULER_OIDC_AUDIENCE"
        value = "https://placeholder.run.app/retention-actions/sweep-scheduled"
      }
      env {
        name  = "SCHEDULER_SA_EMAIL"
        value = ""
      }
      env {
        name  = "RETENTION_SCHEDULER_ENABLED"
        value = "false"
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  depends_on = [
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_iam_member.api_jwt,
    google_secret_manager_secret_iam_member.api_db,
    google_project_iam_member.api_sql_client,
  ]
}

# Web Cloud Run service.
resource "google_cloud_run_v2_service" "web" {
  count    = var.web_image == "" ? 0 : 1
  name     = "bidready-web"
  location = var.region

  template {
    service_account = google_service_account.web_runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }

    containers {
      image = var.web_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_PUBLIC_API_BASE_URL"
        # Updated post-deploy via the workflow; the api service URL is
        # unknown until the api is deployed. Default keeps web buildable.
        value = "https://bidready-api-placeholder.run.app"
      }
    }
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}
