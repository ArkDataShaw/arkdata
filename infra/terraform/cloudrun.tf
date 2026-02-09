###############################################################################
# Cloud Run — Service definitions for the ArkData microservices
###############################################################################

locals {
  cloud_sql_connection = "${var.project_id}:${var.region}:${google_sql_database_instance.arkdata.name}"

  common_env = [
    {
      name  = "GCP_PROJECT_ID"
      value = var.project_id
    },
    {
      name  = "GCP_REGION"
      value = var.region
    },
    {
      name  = "ENVIRONMENT"
      value = var.environment
    },
    {
      name  = "DATABASE_URL"
      value = "postgresql://arkdata:${var.cloudsql_password}@/arkdata?host=/cloudsql/${local.cloud_sql_connection}"
    },
  ]
}

# ---------- pixel-ingest -----------------------------------------------------
# Receives pixel events via HTTP, validates, publishes to Pub/Sub raw-events.

resource "google_cloud_run_v2_service" "pixel_ingest" {
  name     = "pixel-ingest"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.artifact_registry_host}/${var.project_id}/arkdata/pixel-ingest:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      env {
        name  = "PUBSUB_TOPIC_RAW_EVENTS"
        value = google_pubsub_topic.raw_events.name
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
      }
    }

    service_account = google_service_account.pixel_ingest.email

    timeout = "30s"
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.cloud_run]
}

# Public access — pixel endpoints must be reachable without auth
resource "google_cloud_run_v2_service_iam_member" "pixel_ingest_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.pixel_ingest.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_service_account" "pixel_ingest" {
  account_id   = "pixel-ingest"
  display_name = "Pixel Ingest Service"
  project      = var.project_id
}

# ---------- identity-resolution ----------------------------------------------
# Consumes raw-events via Pub/Sub push, resolves visitors, publishes
# identity-updates.

resource "google_cloud_run_v2_service" "identity_resolution" {
  name     = "identity-resolution"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.artifact_registry_host}/${var.project_id}/arkdata/identity-resolution:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      env {
        name  = "PUBSUB_TOPIC_IDENTITY_UPDATES"
        value = google_pubsub_topic.identity_updates.name
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
      }
    }

    service_account = google_service_account.identity_resolution.email

    timeout = "60s"
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.cloud_run]
}

resource "google_service_account" "identity_resolution" {
  account_id   = "identity-resolution"
  display_name = "Identity Resolution Service"
  project      = var.project_id
}

# ---------- analytics-api ----------------------------------------------------
# REST API for dashboards, visitor queries, export. Also handles sync pushes.

resource "google_cloud_run_v2_service" "analytics_api" {
  name     = "analytics-api"
  location = var.region
  project  = var.project_id

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = "${var.artifact_registry_host}/${var.project_id}/arkdata/analytics-api:${var.image_tag}"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      dynamic "env" {
        for_each = local.common_env
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      env {
        name  = "PUBSUB_TOPIC_SYNC_REQUESTS"
        value = google_pubsub_topic.sync_requests.name
      }

      env {
        name  = "GCS_EXPORT_BUCKET"
        value = google_storage_bucket.exports.name
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [local.cloud_sql_connection]
      }
    }

    service_account = google_service_account.analytics_api.email

    timeout = "300s" # longer for export operations
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  depends_on = [google_project_service.cloud_run]
}

resource "google_service_account" "analytics_api" {
  account_id   = "analytics-api"
  display_name = "Analytics API Service"
  project      = var.project_id
}

# ---------- IAM: Cloud SQL Client role for all services ----------------------

resource "google_project_iam_member" "pixel_ingest_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.pixel_ingest.email}"
}

resource "google_project_iam_member" "identity_resolution_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.identity_resolution.email}"
}

resource "google_project_iam_member" "analytics_api_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.analytics_api.email}"
}

# ---------- IAM: Pub/Sub Publisher role for pixel-ingest & identity ----------

resource "google_project_iam_member" "pixel_ingest_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.pixel_ingest.email}"
}

resource "google_project_iam_member" "identity_resolution_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.identity_resolution.email}"
}

resource "google_project_iam_member" "analytics_api_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.analytics_api.email}"
}

# ---------- IAM: GCS access for analytics-api --------------------------------

resource "google_storage_bucket_iam_member" "analytics_api_exports" {
  bucket = google_storage_bucket.exports.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.analytics_api.email}"
}
