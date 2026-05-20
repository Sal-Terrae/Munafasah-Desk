resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "pg" {
  name             = var.sql_instance_name
  database_version = "POSTGRES_16"
  region           = var.region
  deletion_protection = true

  settings {
    tier              = var.sql_tier
    availability_type = "ZONAL"
    disk_size         = 10
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }

    ip_configuration {
      ipv4_enabled = true
      # No authorized networks: connections come from Cloud Run via the
      # Cloud SQL Auth Proxy unix socket, never over public IP.
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "app" {
  name     = var.sql_database_name
  instance = google_sql_database_instance.pg.name
}

resource "google_sql_user" "app" {
  name     = var.sql_user_name
  instance = google_sql_database_instance.pg.name
  password = random_password.db_password.result
}
