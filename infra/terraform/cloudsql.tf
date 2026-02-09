###############################################################################
# Cloud SQL — PostgreSQL 15 instance for transactional / analytical storage
###############################################################################

resource "google_sql_database_instance" "arkdata" {
  name             = "arkdata-pg-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  deletion_protection = var.environment == "production" ? true : false

  settings {
    tier              = "db-custom-2-7680" # 2 vCPU, 7.5 GB RAM
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00" # UTC
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 14
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = null # set to VPC self_link for private IP

      authorized_networks {
        name  = "allow-cloud-run"
        value = "0.0.0.0/0" # tighten via VPC connector in production
      }
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000" # log queries > 1s
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4 # 04:00 UTC
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = false
    }
  }

  depends_on = [google_project_service.cloud_sql]
}

# ---------- Database ---------------------------------------------------------

resource "google_sql_database" "arkdata" {
  name     = "arkdata"
  instance = google_sql_database_instance.arkdata.name
  project  = var.project_id
}

# ---------- User -------------------------------------------------------------

resource "google_sql_user" "arkdata" {
  name     = "arkdata"
  instance = google_sql_database_instance.arkdata.name
  password = var.cloudsql_password
  project  = var.project_id
}
